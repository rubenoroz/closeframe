
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'rubenoroz@gmail.com';
    console.log(`Simulating API for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            planId: true,
            role: true,
            featureOverrides: true
        }
    });

    if (!user) {
        console.log("User not found");
        return;
    }

    console.log(`User Found: Role=${user.role}, PlanID=${user.planId}`);

    // Logic from api/features/me/route.ts

    // 1. Superadmin check
    if (user.role === 'SUPERADMIN') {
        console.log("User is SUPERADMIN. Returning all features as true.");
        const allFeatures = await prisma.feature.findMany({ select: { key: true } });
        const featuresMap = allFeatures.reduce((acc, f) => ({ ...acc, [f.key]: true }), {});
        console.log("lowResDownloads:", featuresMap['lowResDownloads']);
        return;
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
            if (pf.feature.key === 'lowResDownloads') {
                console.log(`Found lowResDownloads in PlanFeatures: enabled=${pf.enabled}, limit=${pf.limit}`);
            }
        });
    } else {
        console.log("User has NO planId.");
    }

    // 3. Apply Overrides
    if (user.featureOverrides && typeof user.featureOverrides === 'object') {
        console.log("Applying Overrides:", user.featureOverrides);
        const overrides = user.featureOverrides as Record<string, any>;
        Object.assign(featuresMap, overrides);
    }

    console.log("Final Result for lowResDownloads:", featuresMap['lowResDownloads']);
    console.log("Final Result for highResDownloads:", featuresMap['highResDownloads']);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
