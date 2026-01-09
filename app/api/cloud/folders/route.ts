import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { google } from "googleapis";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cloudAccountId = searchParams.get("cloudAccountId");
    const folderId = searchParams.get("folderId") || "root"; // Default to root

    if (!cloudAccountId) {
        return NextResponse.json({ error: "Cloud Account ID required" }, { status: 400 });
    }

    try {
        // 1. Fetch Credentials from DB
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId },
        });

        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // 2. Refresh Token Logic (Basic)
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
            // expiry_date: account.expiresAt?.getTime(), 
        });

        // Check if we need to refresh (googleapis handles this if refresh_token is present usually on 401, 
        // but explicit check is better if we want to update DB)
        // For MVP, we presume googleapis auto-refreshes if we pass the refresh_token.
        // However, googleapis auto-refresh updates the credential *in memory*. 
        // Ideally we should listen to 'tokens' event to save back to DB. 
        // For this step, we simply use the provider pattern.

        // 3. Use Provider
        const provider = new GoogleDriveProvider();

        // We need to pass a valid access token. 
        // If googleapis refreshes it, we get a new one. 
        // To keep it simple: We will ask googleapis to give us a fresh token first if needed.
        const tokenInfo = await oauth2Client.getAccessToken();
        const currentToken = tokenInfo.token;

        if (!currentToken) throw new Error("Could not get access token");

        // Update DB if changed (simple check)
        if (currentToken !== account.accessToken) {
            await prisma.cloudAccount.update({
                where: { id: account.id },
                data: { accessToken: currentToken } // In real world, also update expiry
            });
        }

        // 4. List Folders
        const folders = await provider.listFolders(folderId, currentToken);

        return NextResponse.json({ folders });

    } catch (error) {
        console.error("Folder Browser Error:", error);
        return NextResponse.json({ error: "Failed to list folders", details: String(error) }, { status: 500 });
    }
}
