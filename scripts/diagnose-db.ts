
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        // Try to count accounts first
        const count = await prisma.calendarAccount.count();
        console.log(`Found ${count} calendar accounts.`);

        // Try to find one account and check stricture
        const account = await prisma.calendarAccount.findFirst();
        if (account) {
            console.log('Account structure:', Object.keys(account));
            if ('selectedCalendars' in account) {
                console.log('SUCCESS: selectedCalendars field exists in Prisma Client output.');
                console.log('Value:', account.selectedCalendars);
            } else {
                console.error('FAILURE: selectedCalendars field MISSING in Prisma Client output.');
            }
        } else {
            console.log('No accounts found, but query worked.');
        }

    } catch (e) {
        console.error('Database connection or query error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
