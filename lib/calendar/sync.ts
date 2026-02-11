/**
 * Calendar Sync Service
 * Handles bidirectional synchronization between Closerlens and external calendars
 */

import { prisma } from '@/lib/db';
import { GoogleCalendarService, type CalendarEvent } from './google';
import { MicrosoftCalendarService } from './microsoft';

export interface SyncResult {
    success: boolean;
    eventsRead: number;
    eventsWritten: number;
    errors: string[];
}

/**
 * Refresh tokens if needed
 */
export async function refreshTokenIfNeeded(accountId: string): Promise<boolean> {
    const account = await prisma.calendarAccount.findUnique({
        where: { id: accountId }
    });

    if (!account?.expiresAt || !account.refreshToken) {
        return false;
    }

    // Refresh if token expires in less than 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (account.expiresAt > fiveMinutesFromNow) {
        return true; // Token still valid
    }

    try {
        let tokens;

        if (account.provider === 'google_calendar') {
            tokens = await GoogleCalendarService.refreshToken(account.refreshToken);
        } else if (account.provider === 'microsoft_outlook') {
            tokens = await MicrosoftCalendarService.refreshToken(account.refreshToken);
        } else {
            throw new Error(`Unknown provider: ${account.provider}`);
        }

        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        await prisma.calendarAccount.update({
            where: { id: accountId },
            data: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || account.refreshToken,
                expiresAt
            }
        });

        await prisma.calendarSyncLog.create({
            data: {
                calendarAccountId: accountId,
                action: 'oauth_refresh',
                status: 'success',
                eventsProcessed: 0
            }
        });

        return true;
    } catch (error) {
        console.error('Failed to refresh token:', error);

        await prisma.calendarAccount.update({
            where: { id: accountId },
            data: {
                syncStatus: 'error',
                syncError: 'Failed to refresh access token'
            }
        });

        await prisma.calendarSyncLog.create({
            data: {
                calendarAccountId: accountId,
                action: 'oauth_refresh',
                status: 'error',
                eventsProcessed: 0,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
        });

        return false;
    }
}

/**
 * Sync events from external calendar to Closerlens
 */
export async function syncFromExternal(accountId: string): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        eventsRead: 0,
        eventsWritten: 0,
        errors: []
    };

    try {
        // Refresh token if needed
        const tokenValid = await refreshTokenIfNeeded(accountId);
        if (!tokenValid) {
            result.errors.push('Failed to refresh access token');
            return result;
        }

        const account = await prisma.calendarAccount.findUnique({
            where: { id: accountId }
        });

        if (!account || !account.syncEnabled) {
            result.errors.push('Account not found or sync disabled');
            return result;
        }

        // Update sync status
        await prisma.calendarAccount.update({
            where: { id: accountId },
            data: { syncStatus: 'syncing' }
        });

        // Get events for the last 30 days and next 90 days
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);

        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 90);

        let events: CalendarEvent[] = [];

        // Parse selected calendars
        let selectedCalendars: string[] = [];
        if (account.selectedCalendars) {
            if (Array.isArray(account.selectedCalendars)) {
                selectedCalendars = account.selectedCalendars as string[];
            } else {
                // Should be array, but just in case
            }
        }

        if (account.provider === 'google_calendar') {
            events = await GoogleCalendarService.getEvents(
                account.accessToken,
                timeMin,
                timeMax,
                selectedCalendars
            );
        } else if (account.provider === 'microsoft_outlook') {
            events = await MicrosoftCalendarService.getEvents(
                account.accessToken,
                timeMin,
                timeMax,
                selectedCalendars
            );
        }

        result.eventsRead = events.length;

        const seenExternalIds: string[] = [];

        // Upsert events to local database
        for (const event of events) {
            // Skip events created by Closerlens to avoid duplication (echo effect)
            // But ensure we track them in seenExternalIds so they aren't deleted if we have a record of them
            if (event.title && (event.title.startsWith('📅 ') || event.title.startsWith('📅'))) {
                seenExternalIds.push(event.id);
                continue;
            }

            await prisma.externalCalendarEvent.upsert({
                where: {
                    calendarAccountId_externalId: {
                        calendarAccountId: accountId,
                        externalId: event.id
                    }
                },
                update: {
                    title: account.showEventDetails ? event.title : 'Ocupado',
                    start: event.start,
                    end: event.end,
                    allDay: event.allDay,
                    location: account.showEventDetails ? event.location : null,
                    description: account.showEventDetails ? event.description : null,
                    isRecurring: event.isRecurring,
                    recurringEventId: event.recurringEventId,
                    updatedAt: new Date()
                },
                create: {
                    calendarAccountId: accountId,
                    externalId: event.id,
                    title: account.showEventDetails ? event.title : 'Ocupado',
                    start: event.start,
                    end: event.end,
                    allDay: event.allDay,
                    location: account.showEventDetails ? event.location : null,
                    description: account.showEventDetails ? event.description : null,
                    isRecurring: event.isRecurring,
                    recurringEventId: event.recurringEventId
                }
            });
            seenExternalIds.push(event.id);
        }

        // Delete events that are no longer on the remote calendar (or were filtered out)
        // Only within the window we fetched to avoid deleting far future/past events
        await prisma.externalCalendarEvent.deleteMany({
            where: {
                calendarAccountId: accountId,
                start: { gte: timeMin },
                end: { lte: timeMax },
                externalId: { notIn: seenExternalIds }
            }
        });

        // Clean up old events (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await prisma.externalCalendarEvent.deleteMany({
            where: {
                calendarAccountId: accountId,
                end: { lt: thirtyDaysAgo }
            }
        });

        // Update sync status
        await prisma.calendarAccount.update({
            where: { id: accountId },
            data: {
                lastSyncAt: new Date(),
                syncStatus: 'success',
                syncError: null
            }
        });

        // Log success
        await prisma.calendarSyncLog.create({
            data: {
                calendarAccountId: accountId,
                action: 'sync_read',
                status: 'success',
                eventsProcessed: result.eventsRead
            }
        });

        result.success = true;
    } catch (error) {
        console.error('Error syncing from external:', error);
        result.errors.push(error instanceof Error ? error.message : 'Unknown error');

        // Only update status to error if it's a hard failure, not partial
        await prisma.calendarAccount.update({
            where: { id: accountId },
            data: {
                syncStatus: 'error',
                syncError: error instanceof Error ? error.message : 'Sync failed'
            }
        });

        await prisma.calendarSyncLog.create({
            data: {
                calendarAccountId: accountId,
                action: 'sync_read',
                status: 'error',
                eventsProcessed: result.eventsRead,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }

    return result;
}

/**
 * Write a booking to external calendar
 */
export async function writeToExternal(
    accountId: string,
    booking: {
        id: string;
        title: string;
        start: Date;
        end: Date;
        location?: string;
        description?: string;
    }
): Promise<{ success: boolean; externalEventId?: string; error?: string }> {
    try {
        // Refresh token if needed
        const tokenValid = await refreshTokenIfNeeded(accountId);
        if (!tokenValid) {
            return { success: false, error: 'Failed to refresh access token' };
        }

        const account = await prisma.calendarAccount.findUnique({
            where: { id: accountId }
        });

        if (!account || !account.syncEnabled || account.syncDirection !== 'bidirectional') {
            return { success: false, error: 'Account not configured for bidirectional sync' };
        }

        // Check if we already have a linked event for this booking
        const existingLink = await prisma.externalCalendarEvent.findFirst({
            where: {
                calendarAccountId: accountId,
                linkedBookingId: booking.id
            }
        });

        let externalEvent: CalendarEvent;

        if (existingLink) {
            console.log('[CalendarSync] Updating existing external event:', existingLink.externalId);
            if (account.provider === 'google_calendar') {
                externalEvent = await GoogleCalendarService.updateEvent(account.accessToken, existingLink.externalId, {
                    title: booking.title,
                    start: booking.start,
                    end: booking.end,
                    location: booking.location,
                    description: booking.description
                });
            } else if (account.provider === 'microsoft_outlook') {
                externalEvent = await MicrosoftCalendarService.updateEvent(account.accessToken, existingLink.externalId, {
                    title: booking.title,
                    start: booking.start,
                    end: booking.end,
                    location: booking.location,
                    description: booking.description
                });
            } else {
                return { success: false, error: 'Unknown provider' };
            }
        } else {
            console.log('[CalendarSync] Creating new external event');
            if (account.provider === 'google_calendar') {
                externalEvent = await GoogleCalendarService.createEvent(account.accessToken, {
                    title: booking.title,
                    start: booking.start,
                    end: booking.end,
                    location: booking.location,
                    description: booking.description
                });
            } else if (account.provider === 'microsoft_outlook') {
                externalEvent = await MicrosoftCalendarService.createEvent(account.accessToken, {
                    title: booking.title,
                    start: booking.start,
                    end: booking.end,
                    location: booking.location,
                    description: booking.description
                });
            } else {
                return { success: false, error: 'Unknown provider' };
            }
        }

        // Log success
        await prisma.calendarSyncLog.create({
            data: {
                calendarAccountId: accountId,
                action: 'sync_write',
                status: 'success',
                eventsProcessed: 1
            }
        });

        return { success: true, externalEventId: externalEvent.id };
    } catch (error) {
        console.error('Error writing to external:', error);

        await prisma.calendarSyncLog.create({
            data: {
                calendarAccountId: accountId,
                action: 'sync_write',
                status: 'error',
                eventsProcessed: 0,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to write event'
        };
    }
}

/**
 * Get all external events for a user
 */
export async function getExternalEvents(
    userId: string,
    startDate: Date,
    endDate: Date
): Promise<{
    events: {
        id: string;
        title: string;
        start: Date;
        end: Date;
        allDay: boolean;
        location: string | null;
        provider: string;
        accountName: string | null;
    }[]
}> {
    // [LAZY SYNC] Check for stale accounts and sync if needed
    try {
        const accounts = await prisma.calendarAccount.findMany({
            where: {
                userId,
                syncEnabled: true
            }
        });

        const now = Date.now();
        const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

        const syncPromises = accounts
            .filter(account => {
                const lastSync = account.lastSyncAt ? account.lastSyncAt.getTime() : 0;
                // Sync if never synced or older than threshold
                // Also check if status is not 'syncing' to avoid double-triggering (though race conditions exist, it's better than nothing)
                // Actually, if it's 'syncing' but explicitly STALE (e.g. stuck for hours), we might want to retry?
                // For now, let's just respect the time.
                return (now - lastSync > STALE_THRESHOLD_MS);
            })
            .map(account => {
                console.log(`[LazySync] Triggering sync for account ${account.id} (${account.provider})`);
                return syncFromExternal(account.id);
            });

        if (syncPromises.length > 0) {
            // Wait for all syncs to complete before fetching events to ensure freshness
            // This might add latency to the first request, but guarantees data.
            await Promise.all(syncPromises);
        }
    } catch (error) {
        console.error('[LazySync] Error triggering auto-sync:', error);
        // Continue to fetch what we have even if sync failed
    }

    const events = await prisma.externalCalendarEvent.findMany({
        where: {
            calendarAccount: {
                userId,
                syncEnabled: true
            },
            start: { gte: startDate },
            end: { lte: endDate },
            // Don't return events that are linked to local bookings (prevents duplicates in UI)
            linkedBookingId: null,
            // Also filter by title just in case the link was lost but it's clearly ours
            title: {
                not: {
                    startsWith: '📅'
                }
            }
        },
        include: {
            calendarAccount: {
                select: {
                    provider: true,
                    name: true
                }
            }
        },
        orderBy: { start: 'asc' }
    });

    return {
        events: events.map((e: {
            id: string;
            title: string | null;
            start: Date;
            end: Date;
            allDay: boolean;
            location: string | null;
            description: string | null;
            calendarAccount: { provider: string; name: string | null };
        }) => ({
            id: e.id,
            title: e.title || 'Ocupado',
            start: e.start,
            end: e.end,
            allDay: e.allDay,
            location: e.location,
            description: e.description,
            provider: e.calendarAccount.provider,
            accountName: e.calendarAccount.name
        }))
    };
}

/**
 * Sync a booking to all connected calendars for a user
 * Called when a booking is created or updated
 */
export async function syncBookingToCalendars(
    userId: string,
    booking: {
        id: string;
        customerName: string;
        customerEmail: string | null;
        date: Date;
        endDate: Date;
        notes?: string | null;
        status: string;
    }
): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    console.log('[CalendarSync] Starting sync for booking:', booking.id, 'userId:', userId);

    try {
        // Get all calendar accounts for user with bidirectional sync enabled
        const accounts = await prisma.calendarAccount.findMany({
            where: {
                userId,
                syncEnabled: true,
                syncDirection: 'bidirectional'
            }
        });

        console.log('[CalendarSync] Found', accounts.length, 'accounts with bidirectional sync');

        if (accounts.length === 0) {
            console.log('[CalendarSync] No accounts found for sync, skipping');
            return result;
        }

        // Prepare booking data for calendar event
        const title = `📅 ${booking.customerName}`;
        const description = `Reserva de ${booking.customerName}${booking.customerEmail ? `\nEmail: ${booking.customerEmail}` : ''}${booking.notes ? `\n\nNotas: ${booking.notes}` : ''}`;

        console.log('[CalendarSync] Event title:', title);
        console.log('[CalendarSync] Event dates:', booking.date, '->', booking.endDate);

        // Sync to each connected calendar
        for (const account of accounts) {
            console.log('[CalendarSync] Syncing to account:', account.id, account.provider);
            try {
                const syncResult = await writeToExternal(account.id, {
                    id: booking.id,
                    title,
                    start: booking.date,
                    end: booking.endDate,
                    description
                });

                console.log('[CalendarSync] Sync result for', account.provider, ':', syncResult);

                if (syncResult.success && syncResult.externalEventId) {
                    result.synced++;

                    // Store the link between booking and external event to allow future deletion
                    await prisma.externalCalendarEvent.upsert({
                        where: {
                            calendarAccountId_externalId: {
                                calendarAccountId: account.id,
                                externalId: syncResult.externalEventId
                            }
                        },
                        create: {
                            calendarAccountId: account.id,
                            externalId: syncResult.externalEventId,
                            title,
                            start: booking.date,
                            end: booking.endDate,
                            description,
                            linkedBookingId: booking.id
                        },
                        update: {
                            title,
                            start: booking.date,
                            end: booking.endDate,
                            description,
                            linkedBookingId: booking.id,
                            updatedAt: new Date()
                        }
                    });
                } else if (syncResult.error) {
                    console.error('[CalendarSync] Sync error for', account.provider, ':', syncResult.error);
                    result.errors.push(`${account.provider}: ${syncResult.error}`);
                }
            } catch (error) {
                console.error('[CalendarSync] Exception syncing to', account.provider, ':', error);
                result.errors.push(`${account.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    } catch (error) {
        console.error('[CalendarSync] Error syncing booking to calendars:', error);
        result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('[CalendarSync] Final result:', result);
    return result;
}

/**
 * Remove a booking from all connected calendars
 */
export async function removeBookingFromCalendars(userId: string, bookingId: string): Promise<void> {
    console.log('[CalendarSync] Removing booking from calendars:', bookingId);

    // Find all external events linked to this booking
    // We also check for userId through calendarAccount to ensure security
    const linkedEvents = await prisma.externalCalendarEvent.findMany({
        where: {
            linkedBookingId: bookingId,
            calendarAccount: {
                userId
            }
        },
        include: {
            calendarAccount: true
        }
    });

    console.log('[CalendarSync] Found', linkedEvents.length, 'linked external events to remove');

    for (const event of linkedEvents) {
        try {
            // Refresh token if needed
            const tokenValid = await refreshTokenIfNeeded(event.calendarAccountId);

            if (tokenValid) {
                // Refetch account to get fresh token
                const account = await prisma.calendarAccount.findUnique({
                    where: { id: event.calendarAccountId }
                });

                if (account) {
                    if (account.provider === 'google_calendar') {
                        await GoogleCalendarService.deleteEvent(account.accessToken, event.externalId);
                        console.log('[CalendarSync] Removed external event', event.externalId, 'from', account.provider);
                    } else if (account.provider === 'microsoft_outlook') {
                        await MicrosoftCalendarService.deleteEvent(account.accessToken, event.externalId);
                        console.log('[CalendarSync] Removed external event', event.externalId, 'from', account.provider);
                    }
                }
            }
        } catch (error) {
            console.error('[CalendarSync] Failed to remove event from external calendar:', error);
            // Continue execution to delete local record
        } finally {
            // Always delete local record to avoid orphaned links blocking booking deletion
            try {
                await prisma.externalCalendarEvent.delete({
                    where: { id: event.id }
                });
                console.log('[CalendarSync] Deleted local link for event', event.id);
            } catch (localError) {
                console.error('[CalendarSync] Failed to delete local external event record:', localError);
            }
        }
    }
}


/**
 * Delete an external event directly (used when user deletes an external event from Closerlens)
 */
export async function deleteExternalEvent(userId: string, eventId: string): Promise<boolean> {
    const event = await prisma.externalCalendarEvent.findUnique({
        where: { id: eventId },
        include: {
            calendarAccount: true
        }
    });

    if (!event) {
        throw new Error("Event not found");
    }

    if (event.calendarAccount.userId !== userId) {
        throw new Error("Unauthorized");
    }

    // Delete from provider
    try {
        // Refresh token if needed
        await refreshTokenIfNeeded(event.calendarAccountId);

        // Refetch account to get fresh token
        const account = await prisma.calendarAccount.findUnique({
            where: { id: event.calendarAccountId }
        });

        if (account) {
            if (account.provider === 'google_calendar') {
                await GoogleCalendarService.deleteEvent(account.accessToken, event.externalId);
            } else if (account.provider === 'microsoft_outlook') {
                await MicrosoftCalendarService.deleteEvent(account.accessToken, event.externalId);
            }
        }
    } catch (error) {
        console.error("Failed to delete from provider, but removing locally:", error);
        // Continue to delete locally even if provider fails (e.g. already deleted)
    }

    // Delete locally
    await prisma.externalCalendarEvent.delete({
        where: { id: eventId }
    });

    return true;
}
