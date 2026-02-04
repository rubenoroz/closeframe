/**
 * Calendar Accounts Management API
 * GET/DELETE /api/calendar/accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GoogleCalendarService } from '@/lib/calendar/google';
import { MicrosoftCalendarService } from '@/lib/calendar/microsoft';

/**
 * GET - List connected calendar accounts
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

        const accounts = await prisma.calendarAccount.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                provider: true,
                email: true,
                name: true,
                syncEnabled: true,
                syncDirection: true,
                showEventDetails: true,
                autoRefresh: true,
                refreshInterval: true,
                lastSyncAt: true,
                syncStatus: true,
                syncError: true,
                selectedCalendars: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ accounts });
    } catch (error) {
        console.error('Error fetching calendar accounts:', error);
        return NextResponse.json(
            { error: 'Error al obtener cuentas de calendario' },
            { status: 500 }
        );
    }
}

/**
 * PATCH - Update calendar account settings
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { accountId, syncEnabled, syncDirection, showEventDetails, autoRefresh, refreshInterval, selectedCalendars } = body;

        if (!accountId) {
            return NextResponse.json(
                { error: 'Se requiere accountId' },
                { status: 400 }
            );
        }

        // Verify ownership
        const account = await prisma.calendarAccount.findFirst({
            where: {
                id: accountId,
                userId: session.user.id
            }
        });

        if (!account) {
            return NextResponse.json(
                { error: 'Cuenta no encontrada' },
                { status: 404 }
            );
        }

        // Update settings
        const updated = await prisma.calendarAccount.update({
            where: { id: accountId },
            data: {
                ...(syncEnabled !== undefined && { syncEnabled }),
                ...(syncDirection !== undefined && { syncDirection }),
                ...(showEventDetails !== undefined && { showEventDetails }),
                ...(autoRefresh !== undefined && { autoRefresh }),
                ...(refreshInterval !== undefined && { refreshInterval }),
                ...(selectedCalendars !== undefined && { selectedCalendars })
            },
            select: {
                id: true,
                provider: true,
                syncEnabled: true,
                syncDirection: true,
                showEventDetails: true,
                autoRefresh: true,
                refreshInterval: true,
                selectedCalendars: true
            }
        });

        return NextResponse.json({ account: updated });
    } catch (error) {
        console.error('Error updating calendar account:', error);
        return NextResponse.json(
            { error: 'Error al actualizar cuenta de calendario' },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Disconnect a calendar account
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('id');

        if (!accountId) {
            return NextResponse.json(
                { error: 'Se requiere ID de cuenta' },
                { status: 400 }
            );
        }

        // Verify ownership
        const account = await prisma.calendarAccount.findFirst({
            where: {
                id: accountId,
                userId: session.user.id
            }
        });

        if (!account) {
            return NextResponse.json(
                { error: 'Cuenta no encontrada' },
                { status: 404 }
            );
        }

        // Try to revoke token (best effort)
        try {
            if (account.provider === 'google_calendar') {
                await GoogleCalendarService.revokeToken(account.accessToken);
            }
            // Microsoft doesn't have a simple token revocation endpoint
        } catch (revokeError) {
            console.warn('Failed to revoke token:', revokeError);
        }

        // Delete the account (cascade will delete related events and logs)
        await prisma.calendarAccount.delete({
            where: { id: accountId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting calendar account:', error);
        return NextResponse.json(
            { error: 'Error al desconectar cuenta de calendario' },
            { status: 500 }
        );
    }
}
