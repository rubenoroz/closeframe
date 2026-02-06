
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'iamisairodpal@gmail.com';
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
        console.log("User is SUPERADMIN. Logic skipped.");
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
        });
    }

    console.log("Result for lowResDownloads:", featuresMap['lowResDownloads']);
    console.log("Result for highResDownloads:", featuresMap['highResDownloads']);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
