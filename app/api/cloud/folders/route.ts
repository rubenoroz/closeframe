import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { getFreshAuth } from "@/lib/cloud/auth-factory";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cloudAccountId = searchParams.get("cloudAccountId");
    const folderId = searchParams.get("folderId") || "root"; // Default to root

    if (!cloudAccountId) {
        return NextResponse.json({ error: "Cloud Account ID required" }, { status: 400 });
    }

    try {
        // 1. Fetch Cloud Account info to determine provider
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId }
        });

        if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

        // 2. Get Fresh Auth
        // Use generalized auth factory
        const authClient = await getFreshAuth(cloudAccountId);

        // 3. Select Provider
        let provider;
        if (account.provider === "google") {
            provider = new GoogleDriveProvider();
        } else if (account.provider === "microsoft") {
            const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
            provider = new MicrosoftGraphProvider(authClient as string); // Microsoft auth returns token string
        } else if (account.provider === "dropbox") {
            const { DropboxProvider } = await import("@/lib/cloud/dropbox-provider");
            provider = new DropboxProvider(authClient as string);
        } else if (account.provider === "koofr") {
            const { KoofrProvider } = await import("@/lib/cloud/koofr-provider");
            // @ts-ignore
            provider = new KoofrProvider(authClient.email, authClient.password);
        } else {
            return NextResponse.json({ error: "Provider not supported" }, { status: 400 });
        }

        // 4. List Folders
        const folders = await provider.listFolders(folderId, authClient);

        return NextResponse.json({ folders });

    } catch (error) {
        console.error("Folder Browser Error:", error);
        return NextResponse.json({ error: "Failed to list folders", details: String(error) }, { status: 500 });
    }
}
