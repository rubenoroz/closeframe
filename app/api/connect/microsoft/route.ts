import { NextResponse } from "next/server";

export async function GET() {
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || `${baseUrl}/api/connect/microsoft/callback`;

    const tenant = "common"; // For both personal and organizational accounts
    const client_id = process.env.MICROSOFT_CLIENT_ID;

    // Scopes needed for OneDrive access
    const scopes = [
        "User.Read",
        "Files.Read",
        "Files.Read.All",
        "offline_access" // Critical for refresh tokens
    ].join(" ");

    const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?` +
        `client_id=${client_id}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_mode=query` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=12345`; // Should use proper state generation for security

    return NextResponse.redirect(url);
}
