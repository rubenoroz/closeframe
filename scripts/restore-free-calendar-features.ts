
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Restoring Calendar Sync for Free Plan ---");

    // 1. Find Free Plan
    const freePlan = await prisma.plan.findFirst({
        where: { name: 'free' },
        include: { planFeatures: { include: { feature: true } } }
    });

    if (!freePlan) {
        throw new Error("Free plan not found");
    }

    console.log(`Found Free plan: ${freePlan.displayName} (${freePlan.id})`);

    // 2. Enable 'calendarSync'
    const calendarSync = await prisma.feature.findUnique({ where: { key: 'calendarSync' } });

    if (calendarSync) {
        const planFeature = await prisma.planFeature.findUnique({
            where: {
                planId_featureId: {
                    planId: freePlan.id,
                    featureId: calendarSync.id
                }
            }
        });

        if (planFeature) {
            await prisma.planFeature.update({
                where: { id: planFeature.id },
                data: { enabled: true }
            });
            console.log("✅ Re-enabled 'calendarSync' for Free plan.");
        } else {
            // Create if missing
            await prisma.planFeature.create({
                data: {
                    planId: freePlan.id,
                    featureId: calendarSync.id,
                    enabled: true,
                    limit: -1
                }
            });
            console.log("✅ Created and enabled 'calendarSync' for Free plan.");
        }
    } else {
        console.error("❌ Feature 'calendarSync' not found in database.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
