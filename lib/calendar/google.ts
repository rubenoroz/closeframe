/**
 * Google Calendar Service
 * Handles OAuth flow and calendar operations for Google Calendar
 */

const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
];

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export interface GoogleTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

export interface GoogleCalendarEvent {
    id: string;
    summary?: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    recurringEventId?: string;
    status?: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay: boolean;
    isRecurring: boolean;
    recurringEventId?: string;
}

export interface NewCalendarEvent {
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
}

export class GoogleCalendarService {
    /**
     * Generate OAuth authorization URL
     */
    static getAuthUrl(state: string): string {
        const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/calendar/auth/google/callback`;

        const params = new URLSearchParams({
            client_id: clientId!,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: GOOGLE_CALENDAR_SCOPES.join(' '),
            access_type: 'offline',
            prompt: 'consent',
            state
        });

        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCode(code: string): Promise<GoogleTokenResponse> {
        const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/calendar/auth/google/callback`;

        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to exchange code: ${error}`);
        }

        return response.json();
    }

    /**
     * Refresh access token
     */
    static async refreshToken(refreshToken: string): Promise<GoogleTokenResponse> {
        const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: clientId!,
                client_secret: clientSecret!,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to refresh token: ${error}`);
        }

        return response.json();
    }

    /**
     * Get user's calendar info
     */
    static async getCalendarInfo(accessToken: string): Promise<{ id: string; summary: string; email?: string }> {
        const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to get calendar info');
        }

        const data = await response.json();
        return {
            id: data.id,
            summary: data.summary,
            email: data.id // Primary calendar ID is usually the email
        };
    }

    /**
     * List all calendars on the user's account
     */
    static async listCalendars(accessToken: string): Promise<{ id: string; summary: string; primary?: boolean }[]> {
        const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to list calendars');
        }

        const data = await response.json();
        return (data.items || []).map((cal: any) => ({
            id: cal.id,
            summary: cal.summary,
            primary: cal.primary
        }));
    }

    /**
     * Get events from calendar(s)
     */
    static async getEvents(
        accessToken: string,
        timeMin: Date,
        timeMax: Date,
        calendarIds: string[] = ['primary']
    ): Promise<CalendarEvent[]> {
        const params = new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '250'
        });

        // Use 'primary' if no calendars specified
        const targets = (!calendarIds || calendarIds.length === 0) ? ['primary'] : calendarIds;

        try {
            const allHelperPromises = targets.map(async (calId) => {
                const response = await fetch(
                    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events?${params}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );

                if (!response.ok) {
                    console.error(`Failed to fetch events for calendar ${calId}:`, response.statusText);
                    return [];
                }

                const data = await response.json();
                return (data.items || [])
                    .filter((event: GoogleCalendarEvent) => event.status !== 'cancelled')
                    .map((event: GoogleCalendarEvent) => this.mapGoogleEvent(event));
            });

            const results = await Promise.all(allHelperPromises);
            return results.flat().sort((a, b) => a.start.getTime() - b.start.getTime());
        } catch (error) {
            console.error('Error fetching google events:', error);
            // Fallback to primary only if something catastrophic happens
            const response = await fetch(
                `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!response.ok) return [];
            const data = await response.json();
            return (data.items || [])
                .filter((event: GoogleCalendarEvent) => event.status !== 'cancelled')
                .map((event: GoogleCalendarEvent) => this.mapGoogleEvent(event));
        }
    }

    /**
     * Create event in calendar
     */
    static async createEvent(
        accessToken: string,
        event: NewCalendarEvent
    ): Promise<CalendarEvent> {
        const body: Record<string, unknown> = {
            summary: event.title,
            description: event.description,
            location: event.location
        };

        if (event.allDay) {
            body.start = { date: event.start.toISOString().split('T')[0] };
            body.end = { date: event.end.toISOString().split('T')[0] };
        } else {
            body.start = { dateTime: event.start.toISOString() };
            body.end = { dateTime: event.end.toISOString() };
        }

        const response = await fetch(
            `${GOOGLE_CALENDAR_API}/calendars/primary/events`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create event: ${error}`);
        }

        const data = await response.json();
        return this.mapGoogleEvent(data);
    }

    /**
     * Update event in calendar
     */
    static async updateEvent(
        accessToken: string,
        eventId: string,
        event: Partial<NewCalendarEvent>
    ): Promise<CalendarEvent> {
        const body: Record<string, unknown> = {};

        if (event.title) body.summary = event.title;
        if (event.description) body.description = event.description;
        if (event.location) body.location = event.location;

        if (event.start && event.end) {
            if (event.allDay) {
                body.start = { date: event.start.toISOString().split('T')[0] };
                body.end = { date: event.end.toISOString().split('T')[0] };
            } else {
                body.start = { dateTime: event.start.toISOString() };
                body.end = { dateTime: event.end.toISOString() };
            }
        }

        const response = await fetch(
            `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to update event: ${error}`);
        }

        const data = await response.json();
        return this.mapGoogleEvent(data);
    }

    /**
     * Delete event from calendar
     */
    static async deleteEvent(accessToken: string, eventId: string): Promise<void> {
        const response = await fetch(
            `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        if (!response.ok && response.status !== 410) {
            throw new Error('Failed to delete event');
        }
    }

    /**
     * Revoke access token
     */
    static async revokeToken(token: string): Promise<void> {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
            method: 'POST'
        });
    }

    /**
     * Map Google Calendar event to our internal format
     */
    private static mapGoogleEvent(event: GoogleCalendarEvent): CalendarEvent {
        const isAllDay = !event.start.dateTime;
        const start = isAllDay
            ? new Date(event.start.date!)
            : new Date(event.start.dateTime!);
        const end = isAllDay
            ? new Date(event.end.date!)
            : new Date(event.end.dateTime!);

        return {
            id: event.id,
            title: event.summary || '(Sin título)',
            description: event.description,
            location: event.location,
            start,
            end,
            allDay: isAllDay,
            isRecurring: !!event.recurringEventId,
            recurringEventId: event.recurringEventId
        };
    }
}
