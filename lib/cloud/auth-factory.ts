
import { prisma } from "@/lib/db";
import { google } from "googleapis";

export async function getFreshAuth(cloudAccountId: string) {
    const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
    });

    if (!account) {
        throw new Error("Cuenta de nube no encontrada");
    }

    if (account.provider === "google") {
        return getGoogleAuth(account);
    } else if (account.provider === "microsoft") {
        return getMicrosoftAuth(account);
    }

    throw new Error(`Proveedor ${account.provider} no soportado`);
}

// Google Auth Logic (Existing logic refactored)
async function getGoogleAuth(account: any) {
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${baseUrl}/api/connect/google/callback`
    );

    oauth2Client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
    });

    // Refresh if needed
    if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        console.log("Refreshing Google Token for account:", account.id);
        const { credentials } = await oauth2Client.refreshAccessToken();

        await prisma.cloudAccount.update({
            where: { id: account.id },
            data: {
                accessToken: credentials.access_token || "",
                expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                // Only update refresh_token if new one provided
                refreshToken: credentials.refresh_token || undefined
            },
        });

        oauth2Client.setCredentials(credentials);
    }

    return oauth2Client;
}


// Microsoft Auth Logic
async function getMicrosoftAuth(account: any) {
    // Check expiration
    if (account.expiresAt && new Date(account.expiresAt) < new Date(Date.now() + 5 * 60 * 1000)) { // 5 min buffer
        console.log("Refreshing Microsoft Token for account:", account.id);

        if (!account.refreshToken) throw new Error("No refresh token available for Microsoft account");

        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || `${baseUrl}/api/connect/microsoft/callback`;

        const tenant = "common";
        const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

        const body = new URLSearchParams();
        body.append('client_id', process.env.MICROSOFT_CLIENT_ID!);
        body.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET!);
        body.append('grant_type', 'refresh_token');
        body.append('refresh_token', account.refreshToken);
        body.append('scope', 'User.Read Files.Read Files.Read.All offline_access');
        body.append('redirect_uri', REDIRECT_URI);

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });

        const tokens = await response.json();

        if (!response.ok) {
            console.error("Microsoft Refresh Failed:", tokens);
            throw new Error("Failed to refresh Microsoft token");
        }

        const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

        // Update DB
        const updated = await prisma.cloudAccount.update({
            where: { id: account.id },
            data: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined, // New refresh token (often rotated)
                expiresAt: newExpiry
            }
        });

        return updated.accessToken; // For Microsoft we just return the string token for now
    }

    return account.accessToken;
}
