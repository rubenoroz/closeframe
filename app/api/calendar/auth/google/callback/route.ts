/**
 * Google Calendar OAuth - Callback Handler
 * GET /api/calendar/auth/google/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/calendar/google';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Handle OAuth errors
        if (error) {
            console.error('Google OAuth error:', error);
            return NextResponse.redirect(
                new URL('/dashboard/bookings?calendar_error=oauth_denied', request.url)
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                new URL('/dashboard/bookings?calendar_error=missing_params', request.url)
            );
        }

        // Decode and validate state
        let stateData: { userId: string; nonce: string; timestamp: number };
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
        } catch {
            return NextResponse.redirect(
                new URL('/dashboard/bookings?calendar_error=invalid_state', request.url)
            );
        }

        // Check state expiration (5 minutes)
        if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
            return NextResponse.redirect(
                new URL('/dashboard/bookings?calendar_error=expired_state', request.url)
            );
        }

        // Exchange code for tokens
        const tokens = await GoogleCalendarService.exchangeCode(code);

        // Get calendar info
        const calendarInfo = await GoogleCalendarService.getCalendarInfo(tokens.access_token);

        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Create or update calendar account
        await prisma.calendarAccount.upsert({
            where: {
                userId_provider_providerAccountId: {
                    userId: stateData.userId,
                    provider: 'google_calendar',
                    providerAccountId: calendarInfo.id
                }
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined,
                expiresAt,
                email: calendarInfo.email,
                name: calendarInfo.summary,
                syncStatus: 'pending'
            },
            create: {
                userId: stateData.userId,
                provider: 'google_calendar',
                providerAccountId: calendarInfo.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined,
                expiresAt,
                email: calendarInfo.email,
                name: calendarInfo.summary,
                syncEnabled: true,
                syncDirection: 'bidirectional',
                showEventDetails: true,
                autoRefresh: true,
                refreshInterval: 5,
                syncStatus: 'pending'
            }
        });

        // Log the connection
        const account = await prisma.calendarAccount.findFirst({
            where: {
                userId: stateData.userId,
                provider: 'google_calendar',
                providerAccountId: calendarInfo.id
            }
        });

        if (account) {
            await prisma.calendarSyncLog.create({
                data: {
                    calendarAccountId: account.id,
                    action: 'oauth_connect',
                    status: 'success',
                    eventsProcessed: 0
                }
            });
        }

        return NextResponse.redirect(
            new URL('/dashboard/bookings?calendar_connected=google', request.url)
        );
    } catch (error) {
        console.error('Error in Google Calendar callback:', error);
        return NextResponse.redirect(
            new URL('/dashboard/bookings?calendar_error=server_error', request.url)
        );
    }
}
