
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
/**
 * Core function to determine feature access.
 * Priority:
 * 1. User Override (featureOverrides JSON)
 * 2. Plan Configuration (PlanFeature table)
 * 3. Plan Configuration (Plan.config JSON - FALLBACK)
 * 4. Default (False / 0 / Null)
 */
export async function getFeatureAccess(userId: string, featureKey: string): Promise<FeatureAccessResult> {
    if (!userId) return { allowed: false, limit: null };

    // 1. Fetch User with Plan and Overrides
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            planId: true,
            featureOverrides: true,
            plan: {
                select: {
                    config: true
                }
            }
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

    if (!user.planId) {
        const feature = await prisma.feature.findUnique({ where: { key: featureKey } });
        return { allowed: feature?.defaultValue ?? false, limit: null };
    }

    // 3. Check PlanFeature (Database Relation)
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

    // 4. Check Plan.config (JSON) - Fallback for Superadmin created plans
    if (user.plan?.config && typeof user.plan.config === 'object') {
        const config = user.plan.config as any;

        // Check features object in config
        if (config.features && featureKey in config.features) {
            const val = config.features[featureKey];
            if (typeof val === 'boolean') return { allowed: val, limit: null };
            // If the feature key points to a limit directly? Usually defaults structure is features: { key: boolean }, limits: { key: number }
            // But sometimes mixed. Let's assume features are booleans here.
        }

        // Check limits object in config
        if (config.limits && featureKey in config.limits) {
            const val = config.limits[featureKey];
            if (typeof val === 'number') return { allowed: true, limit: val };
        }
    }

    // 5. Fallback to feature default
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
            featureOverrides: true,
            plan: {
                select: {
                    config: true
                }
            }
        }
    });

    if (!user) return {};

    let featuresMap: Record<string, any> = {};

    // 1. Superadmins / Admins - Restore Total Bypass
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
        const allFeatures = await prisma.feature.findMany({ select: { key: true } });
        allFeatures.forEach(f => {
            featuresMap[f.key] = true;
        });
        return featuresMap;
    }

    // 2. Fetch Plan Features
    let planIdToUse = user.planId;
    let planConfigToUse = user.plan?.config;

    // Fallback to 'free' plan if no plan specified
    if (!planIdToUse) {
        const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
        planIdToUse = freePlan?.id || null;
        planConfigToUse = freePlan?.config || null;
    }

    // A. Apply Plan Config (JSON) First
    if (planConfigToUse && typeof planConfigToUse === 'object') {
        const config = planConfigToUse as any;
        if (config.features) {
            Object.assign(featuresMap, config.features);
        }
        if (config.limits) {
            Object.assign(featuresMap, config.limits);
        }
    }

    // B. Apply PlanFeature (Relation) Overrides
    if (planIdToUse) {
        const planFeatures = await prisma.planFeature.findMany({
            where: { planId: planIdToUse },
            include: { feature: true }
        });

        planFeatures.forEach(pf => {
            // Priority to limit if set, otherwise use enabled boolean
            featuresMap[pf.feature.key] = pf.limit !== null ? pf.limit : !!pf.enabled;
        });
    }

    // 3. Apply Overrides
    if (user.featureOverrides && typeof user.featureOverrides === 'object') {
        const overrides = user.featureOverrides as Record<string, any>;
        Object.assign(featuresMap, overrides);
    }

    return featuresMap;
}

