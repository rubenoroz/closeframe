declare module '@vimeo/vimeo' {
    export class Vimeo {
        constructor(clientId: string, clientSecret: string, accessToken?: string);
        buildAuthorizationEndpoint(redirectUri: string, scope: string, state: string): string;
        accessToken(code: string, redirectUri: string, callback: (err: any, token: any) => void): void;
        request(options: any, callback: (err: any, body: any, statusCode?: number, headers?: any) => void): void;
    }
}
