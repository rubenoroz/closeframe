
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fixing calendarSync feature...");

    // 1. Fix Category
    await prisma.feature.update({
        where: { key: 'calendarSync' },
        data: {
            category: 'booking', // Match lib/features.ts
            description: 'Conectar Google Calendar o Microsoft Outlook'
        }
    });

    console.log("Updated category to 'booking'");

    // 2. Ensure PlanFeatures exist for all plans
    const plans = await prisma.plan.findMany();
    const feature = await prisma.feature.findUnique({ where: { key: 'calendarSync' } });

    if (!feature) throw new Error("Feature not found");

    for (const plan of plans) {
        // Check if exists
        const pf = await prisma.planFeature.findUnique({
            where: {
                planId_featureId: {
                    planId: plan.id,
                    featureId: feature.id
                }
            }
        });

        if (!pf) {
            console.log(`Creating missing PlanFeature for plan: ${plan.name}`);
            await prisma.planFeature.create({
                data: {
                    planId: plan.id,
                    featureId: feature.id,
                    enabled: false, // Default to disabled if missing
                    limit: null
                }
            });
        } else {
            console.log(`PlanFeature exists for plan: ${plan.name}`);
        }
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
