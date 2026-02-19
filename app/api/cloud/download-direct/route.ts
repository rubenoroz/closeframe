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

        let downloadUrl: string | null = null;

        if (account.provider === "microsoft") {
            const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
            const provider = new MicrosoftGraphProvider(authClient as string);
            downloadUrl = await provider.getFileContent(fileId);

        } else if (account.provider === "dropbox") {
            const { DropboxProvider } = await import("@/lib/cloud/dropbox-provider");
            const provider = new DropboxProvider(authClient as string);
            downloadUrl = await provider.getFileContent(fileId);

        } else if (account.provider === "koofr") {
            const { KoofrProvider } = await import("@/lib/cloud/koofr-provider");
            // @ts-ignore
            const provider = new KoofrProvider(authClient.email, authClient.password);
            downloadUrl = await provider.getFileContent(fileId);

        } else {
            // Google Logic - Stream the file directly instead of redirect
            // This works for private files that don't have public webContentLink
            const { google } = await import("googleapis");
            const drive = google.drive({ version: "v3", auth: authClient as any });

            // Get file metadata for content type and name
            const fileMeta = await drive.files.get({
                fileId: fileId,
                fields: "name, mimeType, size"
            });

            const fileName = searchParams.get("n") || fileMeta.data.name || "download";
            const mimeType = fileMeta.data.mimeType || "application/octet-stream";
            const fileSize = fileMeta.data.size;

            // Stream the file content directly from Google Drive
            const response = await drive.files.get(
                { fileId: fileId, alt: "media" },
                { responseType: "stream" }
            );

            // Build response headers
            const headers = new Headers();
            headers.set("Content-Type", mimeType);

            const isInline = searchParams.get("inline") === "true";
            const disposition = isInline ? "inline" : "attachment";
            headers.set("Content-Disposition", `${disposition}; filename="${encodeURIComponent(fileName)}"`);

            if (fileSize) {
                headers.set("Content-Length", fileSize);
            }

            // Return streaming response
            return new Response(response.data as any, { headers });
        }

        if (!downloadUrl) {
            throw new Error("Could not generate download link");
        }

        // Redirect to the direct cloud URL (Saves 100% Bandwidth)
        return NextResponse.redirect(downloadUrl);

    } catch (error: any) {
        console.error("Direct Download Error:", error?.message || error);
        return NextResponse.json({
            error: "Failed to download file",
            details: error?.message
        }, { status: 500 });
    }
}
