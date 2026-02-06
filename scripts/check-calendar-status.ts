
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Checking Calendar Status ---");

    // 1. Check Free Plan Features
    const freePlan = await prisma.plan.findFirst({
        where: { name: 'free' },
        include: { planFeatures: { include: { feature: true } } }
    });

    if (freePlan) {
        console.log(`Plan: ${freePlan.displayName}`);
        const syncFeature = freePlan.planFeatures.find(pf => pf.feature.key === 'calendarSync');
        console.log(` - calendarSync enabled: ${syncFeature?.enabled}`);
    }

    // 2. Check Calendar Accounts
    const accounts = await prisma.calendarAccount.findMany({
        include: { user: { select: { email: true, planId: true } } }
    });

    console.log(`\nFound ${accounts.length} calendar accounts:`);
    accounts.forEach(acc => {
        console.log(` - User: ${acc.user.email} | Plan: ${acc.user.planId}`);
        console.log(`   Provider: ${acc.provider}`);
        console.log(`   Sync Enabled: ${acc.syncEnabled}`);
        console.log(`   Sync Direction: ${acc.syncDirection}`);
        console.log(`   Sync Status: ${acc.syncStatus} (Last: ${acc.lastSyncAt})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
