
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Fixing Matrix Associations ---");

    const features = await prisma.feature.findMany();
    const plans = await prisma.plan.findMany();

    console.log(`Checking ${features.length} features across ${plans.length} plans...`);

    let fixedCount = 0;

    for (const feature of features) {
        for (const plan of plans) {
            // Check if link exists
            const existing = await prisma.planFeature.findUnique({
                where: {
                    planId_featureId: {
                        planId: plan.id,
                        featureId: feature.id
                    }
                }
            });

            if (!existing) {
                // Determine sensible default
                // For number types, default to 0 or -1 based on convention?
                // Actually safer to default to disabled/null unless we know better.
                // But PlanFeature needs values.

                // Fetch feature def to check type? We only have DB info here.
                // But we can check feature.defaultValue from DB?
                // Wait, Feature model has defaultValue Boolean.

                let limit: number | null = null;
                // If it looks like a limit (based on key), maybe set a number?
                if (feature.key.startsWith('max')) {
                    limit = 0; // Default limit 0
                }

                await prisma.planFeature.create({
                    data: {
                        planId: plan.id,
                        featureId: feature.id,
                        enabled: false, // Default to disabled
                        limit: limit
                    }
                });
                console.log(`+ Created link: ${feature.key} <-> ${plan.name}`);
                fixedCount++;
            }
        }
    }

    console.log(`\nFixed ${fixedCount} missing associations.`);
    console.log("Done.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
