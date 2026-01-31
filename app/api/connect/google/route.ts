import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET() {
    console.log("OAuth Init - ClientID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...");
    console.log("OAuth Init - Redirect URI:", `|${process.env.GOOGLE_REDIRECT_URI}|`);

    console.log("OAuth Callback - Redirect URI:", `|${process.env.GOOGLE_REDIRECT_URI}|`);

    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    const REDIRECT_URI = `${baseUrl}/api/connect/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );

    const scopes = [
        "https://www.googleapis.com/auth/drive.readonly", // Read-only access to files
        "https://www.googleapis.com/auth/drive.file",     // Create/Edit specific files
        "https://www.googleapis.com/auth/userinfo.email", // Get user email
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent", // Force consent screen to ensure we get a refresh_token
        include_granted_scopes: true,
    });

    console.log("FULL AUTH URL:", url);

    return NextResponse.redirect(url);
}
