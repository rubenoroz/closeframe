/**
 * Microsoft Calendar Service (Outlook)
 * Handles OAuth flow and calendar operations for Microsoft Graph API
 */

const MS_AUTHORITY = 'https://login.microsoftonline.com/common';
const MS_TOKEN_URL = `${MS_AUTHORITY}/oauth2/v2.0/token`;
const MS_AUTH_URL = `${MS_AUTHORITY}/oauth2/v2.0/authorize`;
const MS_GRAPH_API = 'https://graph.microsoft.com/v1.0';

const MS_CALENDAR_SCOPES = [
    'offline_access',
    'Calendars.ReadWrite',
    'User.Read'
];

export interface MicrosoftTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

export interface MicrosoftCalendarEvent {
    id: string;
    subject?: string;
    body?: { content?: string };
    location?: { displayName?: string };
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    isAllDay?: boolean;
    seriesMasterId?: string;
    type?: string;
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

export class MicrosoftCalendarService {
    /**
     * Generate OAuth authorization URL
     */
    static getAuthUrl(state: string): string {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/calendar/auth/microsoft/callback`;

        const params = new URLSearchParams({
            client_id: clientId!,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: MS_CALENDAR_SCOPES.join(' '),
            response_mode: 'query',
            prompt: 'consent',
            state
        });

        return `${MS_AUTH_URL}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCode(code: string): Promise<MicrosoftTokenResponse> {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/calendar/auth/microsoft/callback`;

        const response = await fetch(MS_TOKEN_URL, {
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
    static async refreshToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

        const response = await fetch(MS_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: clientId!,
                client_secret: clientSecret!,
                grant_type: 'refresh_token',
                scope: MS_CALENDAR_SCOPES.join(' ')
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to refresh token: ${error}`);
        }

        return response.json();
    }

    /**
     * Get user's profile info
     */
    static async getUserInfo(accessToken: string): Promise<{ id: string; email: string; displayName?: string }> {
        const response = await fetch(`${MS_GRAPH_API}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to get user info');
        }

        const data = await response.json();
        return {
            id: data.id,
            email: data.mail || data.userPrincipalName,
            displayName: data.displayName
        };
    }

    /**
     * List all calendars on the user's account
     */
    static async listCalendars(accessToken: string): Promise<{ id: string; summary: string; primary?: boolean }[]> {
        const response = await fetch(`${MS_GRAPH_API}/me/calendars`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to list calendars');
        }

        const data = await response.json();
        return (data.value || []).map((cal: any) => ({
            id: cal.id,
            summary: cal.name,
            primary: cal.isDefaultCalendar
        }));
    }

    /**
     * Get events from calendar(s)
     */
    static async getEvents(
        accessToken: string,
        timeMin: Date,
        timeMax: Date,
        calendarIds: string[] = []
    ): Promise<CalendarEvent[]> {
        const params = new URLSearchParams({
            startDateTime: timeMin.toISOString(),
            endDateTime: timeMax.toISOString(),
            $orderby: 'start/dateTime',
            $top: '250'
        });

        // If no specific calendars, use default view (all calendars combined by Outlook usually, or just default)
        // Actually, /me/calendarView usually shows the default calendar. 
        // To get events from multiple specific calendars, we need to query each one.

        let targets: string[] = calendarIds;
        if (!targets || targets.length === 0) {
            // Retrieve default calendar ID if possible or just use special endpoint
            // But let's stick to querying endpoints.
            // If empty, we query default calendar view
            const response = await fetch(
                `${MS_GRAPH_API}/me/calendarView?${params}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!response.ok) {
                throw new Error('Failed to get events');
            }

            const data = await response.json();
            return (data.value || []).map((event: MicrosoftCalendarEvent) =>
                this.mapMicrosoftEvent(event)
            );
        }

        try {
            const allHelperPromises = targets.map(async (calId) => {
                // Determine endpoint. If "primary" is passed as a concept, use /me/calendar/events
                // otherwise /me/calendars/{id}/events
                // Our listCalendars returns actual IDs.

                const response = await fetch(
                    `${MS_GRAPH_API}/me/calendars/${calId}/calendarView?${params}`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Prefer': 'outlook.timezone="UTC"'
                        }
                    }
                );

                if (!response.ok) {
                    console.error(`Failed to fetch events for calendar ${calId}:`, response.statusText);
                    return [];
                }

                const data = await response.json();
                return (data.value || []).map((event: MicrosoftCalendarEvent) =>
                    this.mapMicrosoftEvent(event)
                );
            });

            const results = await Promise.all(allHelperPromises);
            return results.flat().sort((a, b) => a.start.getTime() - b.start.getTime());

        } catch (error) {
            console.error('Error fetching microsoft events:', error);
            // Fallback to default calendar view
            const response = await fetch(
                `${MS_GRAPH_API}/me/calendarView?${params}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Prefer': 'outlook.timezone="UTC"'
                    }
                }
            );
            if (!response.ok) return [];
            const data = await response.json();
            return (data.value || []).map((event: MicrosoftCalendarEvent) =>
                this.mapMicrosoftEvent(event)
            );
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
            subject: event.title,
            body: event.description ? { contentType: 'text', content: event.description } : undefined,
            location: event.location ? { displayName: event.location } : undefined,
            isAllDay: event.allDay || false
        };

        if (event.allDay) {
            body.start = { dateTime: event.start.toISOString().split('T')[0], timeZone: 'UTC' };
            body.end = { dateTime: event.end.toISOString().split('T')[0], timeZone: 'UTC' };
        } else {
            body.start = { dateTime: event.start.toISOString(), timeZone: 'UTC' };
            body.end = { dateTime: event.end.toISOString(), timeZone: 'UTC' };
        }

        const response = await fetch(
            `${MS_GRAPH_API}/me/events`,
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
        return this.mapMicrosoftEvent(data);
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

        if (event.title) body.subject = event.title;
        if (event.description) body.body = { contentType: 'text', content: event.description };
        if (event.location) body.location = { displayName: event.location };

        if (event.start && event.end) {
            if (event.allDay) {
                body.start = { dateTime: event.start.toISOString().split('T')[0], timeZone: 'UTC' };
                body.end = { dateTime: event.end.toISOString().split('T')[0], timeZone: 'UTC' };
                body.isAllDay = true;
            } else {
                body.start = { dateTime: event.start.toISOString(), timeZone: 'UTC' };
                body.end = { dateTime: event.end.toISOString(), timeZone: 'UTC' };
                body.isAllDay = false;
            }
        }

        const response = await fetch(
            `${MS_GRAPH_API}/me/events/${eventId}`,
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
        return this.mapMicrosoftEvent(data);
    }

    /**
     * Delete event from calendar
     */
    static async deleteEvent(accessToken: string, eventId: string): Promise<void> {
        const response = await fetch(
            `${MS_GRAPH_API}/me/events/${eventId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        if (!response.ok && response.status !== 404) {
            throw new Error('Failed to delete event');
        }
    }

    /**
     * Map Microsoft Graph event to our internal format
     */
    private static mapMicrosoftEvent(event: MicrosoftCalendarEvent): CalendarEvent {
        const isAllDay = event.isAllDay || false;
        // We requested Prefer: outlook.timezone="UTC", so the dateTime is in UTC.
        // Microsoft often returns it without the 'Z' suffix (e.g. "2023-01-01T12:00:00.0000000").
        // We append 'Z' to ensure it's parsed as UTC.
        const startStr = event.start.dateTime.endsWith('Z') ? event.start.dateTime : `${event.start.dateTime}Z`;
        const endStr = event.end.dateTime.endsWith('Z') ? event.end.dateTime : `${event.end.dateTime}Z`;

        const start = new Date(startStr);
        const end = new Date(endStr);

        return {
            id: event.id,
            title: event.subject || '(Sin título)',
            description: event.body?.content,
            location: event.location?.displayName,
            start,
            end,
            allDay: isAllDay,
            isRecurring: !!event.seriesMasterId || event.type === 'occurrence',
            recurringEventId: event.seriesMasterId
        };
    }
}
