
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- DIAGNOSTIC START ---');

        // Check Logs
        const logs = await prisma.calendarSyncLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Recent Sync Logs:', logs);

        // Check External Events
        const eventCount = await prisma.externalCalendarEvent.count();
        console.log('Total External Events in DB:', eventCount);

        if (eventCount > 0) {
            const events = await prisma.externalCalendarEvent.findMany({ take: 3 });
            console.log('Sample Events:', events.map(e => ({ id: e.id, title: e.title, start: e.start })));
        }

        // Check Accounts
        const accounts = await prisma.calendarAccount.findMany({
            select: { id: true, provider: true, syncStatus: true, lastSyncAt: true, selectedCalendars: true }
        });
        console.log('Accounts:', accounts);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
