import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, email: true, role: true, planId: true }
    });

    console.log('--- Recent Users ---');
    console.table(users);

    for (const user of users) {
        console.log(`\n--- Features for user: ${user.email} (${user.role}) ---`);

        // Check overrides
        const overrides = await prisma.featureOverride.findMany({
            where: { userId: user.id },
            include: { feature: true }
        });
        console.log('Overrides:', overrides.map(o => `${o.feature.key}: ${o.enabled ?? o.limit}`));

        // Check plan
        if (user.planId) {
            const plan = await prisma.plan.findUnique({
                where: { id: user.planId },
                include: {
                    features: {
                        include: { feature: true }
                    }
                }
            });
            console.log(`Plan: ${plan?.name}`);
            const enabledFeatures = plan?.features.filter(pf => pf.enabled || pf.limit !== null).map(pf => `${pf.feature.key}: ${pf.limit ?? pf.enabled}`);
            console.log('Plan Enabled Features:', enabledFeatures);
        } else {
            console.log('No planId assigned (Fallback to free)');
            const freePlan = await prisma.plan.findUnique({
                where: { name: 'free' },
                include: {
                    features: {
                        include: { feature: true }
                    }
                }
            });
            const enabledFeatures = freePlan?.features.filter(pf => pf.enabled || pf.limit !== null).map(pf => `${pf.feature.key}: ${pf.limit ?? pf.enabled}`);
            console.log('Free Plan Enabled Features:', enabledFeatures);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
