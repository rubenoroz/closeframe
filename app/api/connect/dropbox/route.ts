import { NextResponse } from "next/server";

export async function GET() {
    const clientId = process.env.DROPBOX_CLIENT_ID;

    // Construct Callback URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    const redirectUri = `${baseUrl}/api/connect/dropbox/callback`;

    if (!clientId) {
        return NextResponse.json({ error: "Dropbox Client ID not configured" }, { status: 500 });
    }

    // Dropbox OAuth URL construction
    // token_access_type=offline -> Refresh Tokens
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        token_access_type: "offline",
    });

    const url = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;

    return NextResponse.redirect(url);
}
