
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // 1. Fetch User with Plan and Overrides
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                planId: true,
                role: true,
                featureOverrides: true
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Superadmins have all features
        if (user.role === 'SUPERADMIN') {
            // We could return a flag, but for consistency we return all features as true
            const allFeatures = await prisma.feature.findMany({ select: { key: true } });
            const featuresMap = allFeatures.reduce((acc, f) => ({ ...acc, [f.key]: true }), {});
            return NextResponse.json({ features: featuresMap, role: user.role });
        }

        // 2. Fetch Plan Features
        let featuresMap: Record<string, any> = {};

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

        return NextResponse.json({
            features: featuresMap,
            planId: user.planId,
            role: user.role
        });

    } catch (error) {
        console.error("Failed to fetch features", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
