
import { prisma } from "@/lib/db";
import { google } from "googleapis";
import { decrypt } from "@/lib/security/encryption";

export async function getFreshAuth(cloudAccountId: string) {
    const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
    });

    if (!account) {
        throw new Error("Cuenta de nube no encontrada");
    } else if (account.provider === "google") {
        return getGoogleAuth(account);
    } else if (account.provider === "microsoft") {
        return getMicrosoftAuth(account);
    } else if (account.provider === "dropbox") {
        return getDropboxAuth(account);
    } else if (account.provider === "koofr") {
        return getKoofrAuth(account);
    }


    throw new Error(`Proveedor ${account.provider} no soportado`);
}

// Google Auth Logic (Existing logic refactored)
async function getGoogleAuth(account: any) {
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    console.log(`[GoogleAuth] Initializing for account ${account.id}. BaseURL: ${baseUrl}`);

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${baseUrl}/api/connect/google/callback`
    );

    // Decrypt tokens
    let accessToken = account.accessToken;
    let refreshToken = account.refreshToken;
    try {
        const originalRefresh = refreshToken;
        accessToken = decrypt(accessToken);
        if (refreshToken) refreshToken = decrypt(refreshToken);

        // DIAGNOSTIC LOG (SAFE)
        if (refreshToken && refreshToken.includes(':') && (refreshToken.length > 50)) {
            console.error(`[CRITICAL] Decryption Check Failed: Refresh token still contains ':' after decrypt. This usually implies KEY MISMATCH. Original len: ${originalRefresh?.length}, Decrypted len: ${refreshToken?.length}`);
        } else if (refreshToken) {
            console.log(`[GoogleAuth] Decryption seemingly successful. Token starts with: ${refreshToken.substring(0, 3)}...`);
        }
    } catch (e) {
        console.warn("Failed to decrypt Google tokens, using raw", e);
    }

    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    // Refresh if needed
    if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        console.log("Refreshing Google Token for account:", account.id);
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Encrypt new tokens before saving
        const { encrypt } = await import("@/lib/security/encryption");
        const newAccessToken = encrypt(credentials.access_token || "");
        const newRefreshToken = credentials.refresh_token ? encrypt(credentials.refresh_token) : undefined;

        await prisma.cloudAccount.update({
            where: { id: account.id },
            data: {
                accessToken: newAccessToken,
                expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                // Only update refresh_token if new one provided
                refreshToken: newRefreshToken
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

        // Decrypt refresh token
        let refreshToken = account.refreshToken;
        try {
            refreshToken = decrypt(refreshToken);
        } catch (e) { console.warn("Microsoft decrypt failed", e); }

        const body = new URLSearchParams();
        body.append('client_id', process.env.MICROSOFT_CLIENT_ID!);
        body.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET!);
        body.append('grant_type', 'refresh_token');
        body.append('refresh_token', refreshToken);
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

        // Encrypt new tokens
        const { encrypt } = await import("@/lib/security/encryption");
        const newAccessToken = encrypt(tokens.access_token);
        const newRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined;

        // Update DB
        const updated = await prisma.cloudAccount.update({
            where: { id: account.id },
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken, // New refresh token (often rotated)
                expiresAt: newExpiry
            }
        });

        // Return DECRYPTED access token for immediate use
        return tokens.access_token;
    }

    // Return decrypted access token if not expired
    let accessToken = account.accessToken;
    try {
        accessToken = decrypt(accessToken);
    } catch (e) { console.warn("Microsoft access token decrypt failed", e); }
    return accessToken;
}

// Dropbox Auth Logic
async function getDropboxAuth(account: any) {
    // Dropbox short-lived tokens last 4 hours.
    // Check if processing needed

    // Decrypt tokens
    let accessToken = account.accessToken;
    let refreshToken = account.refreshToken;
    try {
        accessToken = decrypt(accessToken);
        if (refreshToken) refreshToken = decrypt(refreshToken);
    } catch (e) {
        console.warn("Dropbox decrypt failed", e);
    }

    // Check if expired or about to expire (5 min buffer)
    if (account.expiresAt && new Date(account.expiresAt) < new Date(Date.now() + 5 * 60 * 1000)) {
        console.log("Refreshing Dropbox Token for account:", account.id);

        if (!refreshToken) throw new Error("No refresh token available for Dropbox account");

        const clientId = process.env.DROPBOX_CLIENT_ID;
        const clientSecret = process.env.DROPBOX_CLIENT_SECRET;

        const tokenUrl = "https://api.dropboxapi.com/oauth2/token";

        const params = new URLSearchParams();
        params.append("grant_type", "refresh_token");
        params.append("refresh_token", refreshToken);
        params.append("client_id", clientId!);
        params.append("client_secret", clientSecret!);

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });

        const tokens = await response.json();

        if (!response.ok) {
            console.error("Dropbox Refresh Failed:", tokens);
            throw new Error("Failed to refresh Dropbox token");
        }

        // Calculate new expiry (tokens.expires_in seconds)
        const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

        // Encrypt new tokens
        const { encrypt } = await import("@/lib/security/encryption");
        const newAccessToken = encrypt(tokens.access_token);

        // Update DB
        const updated = await prisma.cloudAccount.update({
            where: { id: account.id },
            data: {
                accessToken: newAccessToken,
                expiresAt: newExpiry
            }
        });

        return tokens.access_token;
    }

    return accessToken;
}

// Koofr Auth Logic
function getKoofrAuth(account: any) {
    let password = account.accessToken;
    try {
        // Try to decrypt (Lazy migration support)
        const decrypted = decrypt(password);
        if (decrypted) password = decrypted;
    } catch (e) {
        // If decryption fails (e.g. legacy plain text), use original
    }

    return {
        email: account.email || account.providerId,
        password: password
    };
}
