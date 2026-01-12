import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { getFreshGoogleAuth } from "@/lib/cloud/google-auth";
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
        // Use centralized auth utility
        const authClient = await getFreshGoogleAuth(cloudAccountId);

        // 3. Use Provider
        const provider = new GoogleDriveProvider();

        // 4. List Folders
        // getFreshGoogleAuth returns an OAuth2 client, which the provider handles
        const folders = await provider.listFolders(folderId, authClient);

        return NextResponse.json({ folders });

    } catch (error) {
        console.error("Folder Browser Error:", error);
        return NextResponse.json({ error: "Failed to list folders", details: String(error) }, { status: 500 });
    }
}
