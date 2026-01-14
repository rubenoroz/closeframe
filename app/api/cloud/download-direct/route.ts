import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";

/**
 * Direct file download from Google Drive (no ZIP)
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

        if (!account || !account.accessToken) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // Setup Google Auth
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
        });

        // Refresh token if needed
        const tokenInfo = await auth.getAccessToken();
        if (tokenInfo.token && tokenInfo.token !== account.accessToken) {
            await prisma.cloudAccount.update({
                where: { id: account.id },
                data: { accessToken: tokenInfo.token }
            });
        }

        const drive = google.drive({ version: "v3", auth });

        // Get file metadata first
        const fileMeta = await drive.files.get({
            fileId: fileId,
            fields: "name,mimeType,size"
        });

        const actualFileName = fileMeta.data.name || fileName;
        const mimeType = fileMeta.data.mimeType || "application/octet-stream";

        // Stream the file
        const response = await drive.files.get(
            { fileId: fileId, alt: "media" },
            { responseType: "stream" }
        );

        // Sanitize filename for Content-Disposition header
        const safeFileName = actualFileName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\x00-\x7F]/g, "_");

        // Create a ReadableStream from the Google Drive response
        const stream = response.data as NodeJS.ReadableStream;

        // Convert Node stream to Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk) => {
                    controller.enqueue(chunk);
                });
                stream.on("end", () => {
                    controller.close();
                });
                stream.on("error", (err) => {
                    controller.error(err);
                });
            },
        });

        return new NextResponse(webStream, {
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
