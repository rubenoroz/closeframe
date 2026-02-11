/**
 * Microsoft Calendar OAuth - Initiate Flow
 * GET /api/calendar/auth/microsoft
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { MicrosoftCalendarService } from '@/lib/calendar/microsoft';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        // Check if user has calendarSync feature
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { plan: true }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        // Verify plan allows calendarSync
        // [SECURE] Use dynamic feature check instead of hardcoded plans
        const { canUseFeature } = await import("@/lib/features/service");
        const allowed = await canUseFeature(session.user.id, 'calendarSync');

        if (!allowed) {
            return NextResponse.json(
                { error: 'Esta función requiere un plan superior' },
                { status: 403 }
            );
        }

        // Generate state for CSRF protection
        const state = randomBytes(32).toString('hex');

        const stateData = Buffer.from(JSON.stringify({
            userId: session.user.id,
            nonce: state,
            timestamp: Date.now()
        })).toString('base64url');

        const authUrl = MicrosoftCalendarService.getAuthUrl(stateData);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('Error initiating Microsoft Calendar auth:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
