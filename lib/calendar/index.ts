/**
 * Calendar Services Index
 * Unified interface for calendar integrations
 */

export { GoogleCalendarService } from './google';
export { MicrosoftCalendarService } from './microsoft';
export type { CalendarEvent, NewCalendarEvent } from './google';

export type CalendarProvider = 'google_calendar' | 'microsoft_outlook';

export interface CalendarServiceConfig {
    accessToken: string;
    refreshToken?: string;
}

/**
 * Get appropriate calendar service based on provider
 */
export function getCalendarService(provider: CalendarProvider) {
    switch (provider) {
        case 'google_calendar':
            return require('./google').GoogleCalendarService;
        case 'microsoft_outlook':
            return require('./microsoft').MicrosoftCalendarService;
        default:
            throw new Error(`Unknown calendar provider: ${provider}`);
    }
}
