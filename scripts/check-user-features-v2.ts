import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, email: true, role: true, planId: true, featureOverrides: true }
    });

    console.log('--- Recent Users ---');
    // Simple table print without console.table to avoid issues with JSON fields
    users.forEach(u => console.log(`${u.id} | ${u.email} | ${u.role} | Plan: ${u.planId}`));

    for (const user of users) {
        console.log(`\n--- User: ${user.email} (${user.role}) ---`);
        console.log('Overrides (JSON):', JSON.stringify(user.featureOverrides));

        let planIdToUse = user.planId;
        if (!planIdToUse) {
            const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
            planIdToUse = freePlan?.id || null;
        }

        if (planIdToUse) {
            const plan = await prisma.plan.findUnique({
                where: { id: planIdToUse },
                include: {
                    planFeatures: {
                        include: { feature: true }
                    }
                }
            });
            console.log(`Effective Plan: ${plan?.name}`);
            const enabledFeatures = plan?.planFeatures.filter(pf => (pf.enabled === true) || (pf.limit !== null)).map(pf => `${pf.feature.key}: ${pf.limit ?? pf.enabled}`);
            console.log('Plan Enabled Features:', enabledFeatures);
        } else {
            console.log('No plan found even after fallback.');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
