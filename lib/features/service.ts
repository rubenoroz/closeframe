
import { prisma } from "@/lib/db";

// Cache interface (could be implemented with Redis or NodeCache later)
// For now, request-deduplication via React cache or similar might be useful if we were using it in RSC,
// but for API routes we will just hit the DB. Prisma has some internal caching.

export async function canUseFeature(userId: string, featureKey: string): Promise<boolean> {
    const { allowed } = await getFeatureAccess(userId, featureKey);
    return allowed;
}

export async function getFeatureLimit(userId: string, featureKey: string): Promise<number | null> {
    const { limit } = await getFeatureAccess(userId, featureKey);
    return limit;
}

interface FeatureAccessResult {
    allowed: boolean;
    limit: number | null;
}

/**
 * Core function to determine feature access.
 * Priority:
 * 1. User Override (featureOverrides JSON)
 * 2. Plan Configuration (PlanFeature)
 * 3. Default (False / 0 / Null)
 */
export async function getFeatureAccess(userId: string, featureKey: string): Promise<FeatureAccessResult> {
    if (!userId) return { allowed: false, limit: null };

    // 1. Fetch User with Plan and Overrides
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            planId: true,
            featureOverrides: true
        }
    });

    if (!user) return { allowed: false, limit: null };

    // 2. Check Overrides
    if (user.featureOverrides && typeof user.featureOverrides === 'object') {
        const overrides = user.featureOverrides as Record<string, any>;
        if (featureKey in overrides) {
            const val = overrides[featureKey];
            if (typeof val === 'boolean') {
                return { allowed: val, limit: null };
            }
            if (typeof val === 'number') {
                return { allowed: true, limit: val };
            }
            // Explicit null limit override?
            if (val === null) {
                return { allowed: true, limit: null };
            }
        }
    }

    // 3. Check Plan
    if (!user.planId) {
        // Fallback to "free" plan logical defaults if necessary, 
        // but ideally every user has a planId. If null, maybe use the default feature value?
        // Let's assume strict: No plan = No features unless default is true.
        // We can fetch the default feature value.
        const feature = await prisma.feature.findUnique({ where: { key: featureKey } });
        return { allowed: feature?.defaultValue ?? false, limit: null };
    }

    // 4. Fetch PlanFeature
    // Note: We search by Key, not ID, so we need a join.
    const planFeature = await prisma.planFeature.findFirst({
        where: {
            planId: user.planId,
            feature: {
                key: featureKey
            }
        }
    });

    if (planFeature) {
        return {
            allowed: planFeature.enabled,
            limit: planFeature.limit
        };
    }

    // 5. Feature exists but not linked to plan? (Should not happen if seeded correctly)
    // Fallback to feature default
    const feature = await prisma.feature.findUnique({ where: { key: featureKey } });
    return { allowed: feature?.defaultValue ?? false, limit: null };
}

/**
 * Returns all effective features for a user as a flat object (Map).
 */
export async function getEffectiveFeatures(userId: string): Promise<Record<string, any>> {
    if (!userId) return {};

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            planId: true,
            role: true,
            featureOverrides: true
        }
    });

    if (!user) return {};

    let featuresMap: Record<string, any> = {};

    // 1. Superadmins have everything
    if (user.role === 'SUPERADMIN') {
        const allFeatures = await prisma.feature.findMany({ select: { key: true } });
        // We could return a flag, but for consistency we return all features as true
        featuresMap = allFeatures.reduce((acc: Record<string, boolean>, f) => ({ ...acc, [f.key]: true }), {});
        return featuresMap;
    }

    // 2. Fetch Plan Features
    if (user.planId) {
        const planFeatures = await prisma.planFeature.findMany({
            where: { planId: user.planId },
            include: { feature: true }
        });

        planFeatures.forEach(pf => {
            featuresMap[pf.feature.key] = pf.enabled || pf.limit;
        });
    }

    // 3. Apply Overrides
    if (user.featureOverrides && typeof user.featureOverrides === 'object') {
        const overrides = user.featureOverrides as Record<string, any>;
        Object.assign(featuresMap, overrides);
    }

    return featuresMap;
}
