/**
 * Calendar Sync API
 * POST /api/calendar/sync - Trigger manual sync
 * GET /api/calendar/sync/events - Get external events for display
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { syncFromExternal, getExternalEvents } from '@/lib/calendar/sync';

/**
 * POST - Trigger manual sync for all accounts or specific account
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const { accountId } = body;

        let accounts;

        if (accountId) {
            // Sync specific account
            const account = await prisma.calendarAccount.findFirst({
                where: {
                    id: accountId,
                    userId: session.user.id,
                    syncEnabled: true
                }
            });

            if (!account) {
                return NextResponse.json(
                    { error: 'Cuenta no encontrada o sincronización deshabilitada' },
                    { status: 404 }
                );
            }

            accounts = [account];
        } else {
            // Sync all accounts
            accounts = await prisma.calendarAccount.findMany({
                where: {
                    userId: session.user.id,
                    syncEnabled: true
                }
            });
        }

        const results = [];

        for (const account of accounts) {
            const result = await syncFromExternal(account.id);
            results.push({
                accountId: account.id,
                provider: account.provider,
                ...result
            });
        }

        const allSuccess = results.every(r => r.success);
        const totalEventsRead = results.reduce((sum, r) => sum + r.eventsRead, 0);

        return NextResponse.json({
            success: allSuccess,
            totalEventsRead,
            results
        });
    } catch (error) {
        console.error('Error in calendar sync:', error);
        return NextResponse.json(
            { error: 'Error al sincronizar calendario' },
            { status: 500 }
        );
    }
}

/**
 * GET - Get external events for the calendar view
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const startStr = searchParams.get('start');
        const endStr = searchParams.get('end');

        // Default to current month if not specified
        const now = new Date();
        const startDate = startStr ? new Date(startStr) : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = endStr ? new Date(endStr) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { events } = await getExternalEvents(session.user.id, startDate, endDate);

        return NextResponse.json({ events });
    } catch (error) {
        console.error('Error fetching external events:', error);
        return NextResponse.json(
            { error: 'Error al obtener eventos externos' },
            { status: 500 }
        );
    }
}
