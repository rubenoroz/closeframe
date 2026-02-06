
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Updating Free Plan Permissions ---");

    // 1. Find Free Plan
    const freePlan = await prisma.plan.findFirst({
        where: { name: 'free' }
    });

    if (!freePlan) {
        console.error("Free plan not found!");
        return;
    }

    console.log(`Found Free plan: ${freePlan.displayName} (${freePlan.id})`);

    // 2. Enable bookingConfig (Agenda Access)
    const bookingConfig = await prisma.feature.findUnique({ where: { key: 'bookingConfig' } });
    if (bookingConfig) {
        await prisma.planFeature.update({
            where: {
                planId_featureId: {
                    planId: freePlan.id,
                    featureId: bookingConfig.id
                }
            },
            data: { enabled: true }
        });
        console.log("✅ Enabled 'bookingConfig' for Free plan.");
    } else {
        console.error("❌ Feature 'bookingConfig' not found.");
    }

    // 3. Ensure calendarSync is DISABLED
    const calendarSync = await prisma.feature.findUnique({ where: { key: 'calendarSync' } });
    if (calendarSync) {
        await prisma.planFeature.update({
            where: {
                planId_featureId: {
                    planId: freePlan.id,
                    featureId: calendarSync.id
                }
            },
            data: { enabled: false }
        });
        console.log("✅ Verified 'calendarSync' is DISABLED for Free plan.");
    } else {
        console.error("❌ Feature 'calendarSync' not found.");
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
