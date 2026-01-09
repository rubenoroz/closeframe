import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET() {
    console.log("OAuth Init - ClientID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...");
    console.log("OAuth Init - Redirect URI:", `|${process.env.GOOGLE_REDIRECT_URI}|`);

    console.log("OAuth Callback - Redirect URI:", `|${process.env.GOOGLE_REDIRECT_URI}|`);

    const REDIRECT_URI = "http://localhost:3000/api/connect/google/callback";

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );

    const scopes = [
        "https://www.googleapis.com/auth/drive.readonly", // Read-only access to files
        "https://www.googleapis.com/auth/userinfo.email", // Get user email
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "select_account consent",
    });

    console.log("FULL AUTH URL:", url);

    return NextResponse.redirect(url);
}
