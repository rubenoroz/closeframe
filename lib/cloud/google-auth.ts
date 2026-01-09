import { google } from "googleapis";
import { prisma } from "@/lib/db";

/**
 * Gets a fresh, authorized OAuth2 client for a given cloud account.
 * Handles automatic token refreshing and database updates.
 */
export async function getFreshGoogleAuth(cloudAccountId: string) {
    const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
    });

    if (!account) {
        throw new Error("Cloud account not found");
    }

    if (account.provider !== "google") {
        throw new Error("Account is not a Google account");
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken || undefined,
    });

    // getAccessToken() automatically uses the refresh_token if the access_token is expired
    const { token } = await oauth2Client.getAccessToken();

    if (!token) {
        throw new Error("Failed to get fresh access token");
    }

    // If the token changed, update the database
    if (token !== account.accessToken) {
        await prisma.cloudAccount.update({
            where: { id: account.id },
            data: {
                accessToken: token,
                // If the refresh token was rotated, we'd update it here too, 
                // but Google typically doesn't rotate it unless requested.
            },
        });
    }

    return oauth2Client;
}
