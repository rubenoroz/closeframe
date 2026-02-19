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
        let mimeType = "application/octet-stream";
        let fileName = searchParams.get("n") || "download";
        let fileSize: string | undefined = undefined;

        if (account.provider === "microsoft") {
            const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
            const provider = new MicrosoftGraphProvider(authClient as string);
            downloadUrl = await provider.getFileContent(fileId);
            // Microsoft pre-signed URLs usually have valid content-type headers when fetched

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
            // Google Logic - Stream the file directly
            const { google } = await import("googleapis");
            const drive = google.drive({ version: "v3", auth: authClient as any });

            // Get metadata
            const fileMeta = await drive.files.get({
                fileId: fileId,
                fields: "name, mimeType, size"
            });

            fileName = searchParams.get("n") || fileMeta.data.name || fileName;
            mimeType = fileMeta.data.mimeType || mimeType;
            fileSize = fileMeta.data.size || undefined;

            const response = await drive.files.get(
                { fileId: fileId, alt: "media" },
                { responseType: "stream" }
            );

            // Google returns a readable stream in data
            return streamResponse(response.data, fileName, mimeType, fileSize, searchParams.get("inline") === "true");
        }

        if (!downloadUrl) {
            throw new Error("Could not generate download link");
        }

        // Universal Proxy Logic for other providers
        // Fetch the content from the pre-signed/direct URL and stream it to the client
        // This bypasses CORS and Auth headers issues for the browser
        const proxyRes = await fetch(downloadUrl);

        if (!proxyRes.ok) {
            throw new Error(`Proxy Request Failed: ${proxyRes.status}`);
        }

        // Try to get metadata from headers if not known
        const contentType = proxyRes.headers.get("content-type") || mimeType;
        const contentLength = proxyRes.headers.get("content-length") || undefined;

        // @ts-ignore
        return streamResponse(proxyRes.body, fileName, contentType, contentLength, searchParams.get("inline") === "true");

    } catch (error: any) {
        console.error("Direct Download Error:", error?.message || error);
        return NextResponse.json({
            error: "Failed to download file",
            details: error?.message
        }, { status: 500 });
    }
}

function streamResponse(
    stream: any,
    fileName: string,
    contentType: string,
    contentLength: string | number | undefined,
    isInline: boolean
) {
    const headers = new Headers();
    headers.set("Content-Type", contentType);

    // Force inline if requested, otherwise default to attachment
    // Clean filename for header
    const safeName = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
    const disposition = isInline ? "inline" : "attachment";
    headers.set("Content-Disposition", `${disposition}; filename*=UTF-8''${safeName}`);

    if (contentLength) {
        headers.set("Content-Length", contentLength.toString());
    }

    return new Response(stream, { headers });
}
