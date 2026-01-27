import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";

/**
 * Direct file download from Google Drive / OneDrive (no ZIP)
 * For single file downloads
 * 
 * Query params:
 *   - c: cloudAccountId
 *   - f: fileId
 *   - n: fileName (optional, for Content-Disposition)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const cloudAccountId = searchParams.get("c");
        const fileId = searchParams.get("f");
        const fileName = searchParams.get("n") || "download";

        if (!cloudAccountId || !fileId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Get cloud account
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId },
        });

        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // 2. Get Fresh Auth Client
        const { getFreshAuth } = await import("@/lib/cloud/auth-factory");
        const authClient = await getFreshAuth(cloudAccountId);

        let fileBuffer: ArrayBuffer | null = null;
        let mimeType = "application/octet-stream";
        let safeFileName = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7F]/g, "_");

        if (account.provider === "microsoft") {
            const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
            const provider = new MicrosoftGraphProvider(authClient as string);

            // Get download URL
            const downloadUrl = await provider.getFileContent(fileId);
            if (!downloadUrl) throw new Error("No download URL found");

            const res = await fetch(downloadUrl);
            if (!res.ok) throw new Error("Failed to fetch file content from Microsoft");

            fileBuffer = await res.arrayBuffer();
            mimeType = res.headers.get("content-type") || mimeType;

        } else if (account.provider === "dropbox") {
            const { DropboxProvider } = await import("@/lib/cloud/dropbox-provider");
            const provider = new DropboxProvider(authClient as string);

            // Get download URL
            const downloadUrl = await provider.getFileContent(fileId);
            if (!downloadUrl) throw new Error("No download URL found for Dropbox");

            const res = await fetch(downloadUrl);
            if (!res.ok) throw new Error("Failed to fetch file content from Dropbox");

            fileBuffer = await res.arrayBuffer();
            mimeType = res.headers.get("content-type") || mimeType;

        } else if (account.provider === "koofr") {
            const { KoofrProvider } = await import("@/lib/cloud/koofr-provider");
            // @ts-ignore
            const provider = new KoofrProvider(authClient.email, authClient.password);

            // Get download URL (API URL)
            const downloadUrl = await provider.getFileContent(fileId);
            if (!downloadUrl) throw new Error("No download URL found for Koofr");

            // Fetch with basic auth
            const res = await provider.fetchWithAuth(downloadUrl);
            if (!res.ok) throw new Error("Failed to fetch file content from Koofr");

            fileBuffer = await res.arrayBuffer();
            mimeType = res.headers.get("content-type") || mimeType;

        } else {
            // Google Logic
            const { google } = await import("googleapis");
            const drive = google.drive({ version: "v3", auth: authClient as any });

            // Get file metadata first
            const fileMeta = await drive.files.get({
                fileId: fileId,
                fields: "name,mimeType,size"
            });

            const actualFileName = fileMeta.data.name || fileName;
            mimeType = fileMeta.data.mimeType || "application/octet-stream";

            // Sanitize filename
            safeFileName = actualFileName
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^\x00-\x7F]/g, "_");

            // Download as buffer (reliable)
            const response = await drive.files.get(
                { fileId: fileId, alt: "media" },
                { responseType: "arraybuffer" }
            );

            fileBuffer = response.data as ArrayBuffer;
        }

        if (!fileBuffer) throw new Error("Failed to create download buffer");

        return new NextResponse(new Uint8Array(fileBuffer), {
            headers: {
                "Content-Type": mimeType,
                "Content-Disposition": `attachment; filename="${safeFileName}"`,
                "Cache-Control": "no-cache",
            },
        });

    } catch (error: any) {
        console.error("Direct Download Error:", error?.message || error);
        return NextResponse.json({
            error: "Failed to download file",
            details: error?.message
        }, { status: 500 });
    }
}
