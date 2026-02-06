
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Adding missing feature: maxScenaProjects...");

    // 1. Ensure Feature exists
    await prisma.feature.upsert({
        where: { key: 'maxScenaProjects' },
        update: {
            category: 'scena',
            description: 'Límite de tableros propios (0 = Solo invitado)',
        },
        create: {
            key: 'maxScenaProjects',
            description: 'Límite de tableros propios (0 = Solo invitado)',
            category: 'scena',
            // defaultValue: 0 // Removed because schema says Boolean, handled in PlanFeature limit
        }
    });

    // 2. Add to all Plans
    const plans = await prisma.plan.findMany();
    const feature = await prisma.feature.findUnique({ where: { key: 'maxScenaProjects' } });

    if (!feature) throw new Error("Feature not created");

    for (const plan of plans) {
        // Set smart defaults based on plan name if possible, otherwise 0
        let limit = 0;
        const name = plan.name.toLowerCase();

        if (name.includes('pro') || name.includes('agency') || name.includes('studio')) {
            limit = -1; // Unlimited for paid plans by default, can be changed
        } else if (name.includes('family')) {
            limit = 5;
        } else {
            limit = 1; // Free users get 1 project
        }

        await prisma.planFeature.upsert({
            where: {
                planId_featureId: {
                    planId: plan.id,
                    featureId: feature.id
                }
            },
            update: {
                // Don't overwrite if exists (though it shouldn't for this missing feature)
            },
            create: {
                planId: plan.id,
                featureId: feature.id,
                enabled: true,
                limit: limit
            }
        });
        console.log(`Added maxScenaProjects to plan ${plan.name} with limit ${limit}`);
    }

    console.log("Done!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
