/**
 * API to list calendars from a connected account
 * GET /api/calendar/calendars?accountId=X
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GoogleCalendarService } from '@/lib/calendar/google';
import { MicrosoftCalendarService } from '@/lib/calendar/microsoft';
import { refreshTokenIfNeeded } from '@/lib/calendar/sync';

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
        const accountId = searchParams.get('accountId');

        if (!accountId) {
            return NextResponse.json(
                { error: 'Se requiere accountId' },
                { status: 400 }
            );
        }

        // Check ownership
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

        // Refresh token if needed
        await refreshTokenIfNeeded(account.id);

        // Fetch fresh account data with needed tokens
        const freshAccount = await prisma.calendarAccount.findUnique({
            where: { id: accountId }
        });

        if (!freshAccount) throw new Error("Account vanished");

        let calendars: any[] = [];
        try {
            if (freshAccount.provider === 'google_calendar') {
                calendars = await GoogleCalendarService.listCalendars(freshAccount.accessToken);
            } else if (freshAccount.provider === 'microsoft_outlook') {
                calendars = await MicrosoftCalendarService.listCalendars(freshAccount.accessToken);
            }
        } catch (error) {
            console.error('Provider fetch error:', error);
            // If fetching fails (e.g. invalid token), we might want to return empty or error
            // But let's return error so UI handles it.
            return NextResponse.json(
                { error: 'Error obteniendo lista de calendarios del proveedor' },
                { status: 502 }
            );
        }

        return NextResponse.json({ calendars });

    } catch (error) {
        console.error('Error fetching calendar list:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
