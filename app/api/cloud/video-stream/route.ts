import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { getFreshAuth } from "@/lib/cloud/auth-factory";

/**
 * Video Streaming Proxy for Google Drive
 * Supports HTTP Range requests for seeking
 * 
 * Query params:
 *   - c: cloudAccountId
 *   - f: fileId
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const cloudAccountId = searchParams.get("c");
        const fileId = searchParams.get("f");

        if (!cloudAccountId || !fileId) {
            return NextResponse.json({ error: "Missing cloudAccountId or fileId" }, { status: 400 });
        }

        // Use centralized auth factory (handles decryption and refresh)
        const authClient = await getFreshAuth(cloudAccountId);

        // @ts-ignore
        const drive = google.drive({ version: "v3", auth: authClient });

        // Get file metadata first to know the size and mimeType
        const fileMeta = await drive.files.get({
            fileId: fileId,
            fields: "size,mimeType,name"
        });

        const fileSize = parseInt(fileMeta.data.size || "0");
        let mimeType = fileMeta.data.mimeType || "video/mp4";

        // [FIX] Google Drive sometimes returns octet-stream or video/mp4 for audio
        // We fallback to extension detection to ensure <audio> tags work
        if (fileMeta.data.name) {
            const lowerName = fileMeta.data.name.toLowerCase();
            if (lowerName.endsWith(".mp3")) mimeType = "audio/mpeg";
            else if (lowerName.endsWith(".wav")) mimeType = "audio/wav";
            else if (lowerName.endsWith(".m4a")) mimeType = "audio/mp4";
            else if (lowerName.endsWith(".aac")) mimeType = "audio/aac";
            else if (lowerName.endsWith(".ogg")) mimeType = "audio/ogg";
            else if (lowerName.endsWith(".flac")) mimeType = "audio/flac";
        }

        console.log(`[VideoStream] Streaming ${fileId} (${fileMeta.data.name}): ${mimeType}`);

        // Check for Range header (for seeking support)
        const rangeHeader = req.headers.get("range");

        if (rangeHeader) {
            // Parse range header
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            // Fetch partial content from Google Drive
            const response = await drive.files.get(
                { fileId: fileId, alt: "media" },
                {
                    responseType: "stream",
                    headers: {
                        Range: `bytes=${start}-${end}`
                    }
                }
            );

            // Create a ReadableStream from the Google response
            const stream = new ReadableStream({
                async start(controller) {
                    const googleStream = response.data as NodeJS.ReadableStream;

                    googleStream.on("data", (chunk: Buffer) => {
                        controller.enqueue(new Uint8Array(chunk));
                    });

                    googleStream.on("end", () => {
                        controller.close();
                    });

                    googleStream.on("error", (error) => {
                        controller.error(error);
                    });
                }
            });

            return new NextResponse(stream, {
                status: 206,
                headers: {
                    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": String(chunkSize),
                    "Content-Type": mimeType,
                    "Cache-Control": "public, max-age=3600"
                }
            });
        } else {
            // Full file request (no range)
            const response = await drive.files.get(
                { fileId: fileId, alt: "media" },
                { responseType: "stream" }
            );

            const stream = new ReadableStream({
                async start(controller) {
                    const googleStream = response.data as NodeJS.ReadableStream;

                    googleStream.on("data", (chunk: Buffer) => {
                        controller.enqueue(new Uint8Array(chunk));
                    });

                    googleStream.on("end", () => {
                        controller.close();
                    });

                    googleStream.on("error", (error) => {
                        controller.error(error);
                    });
                }
            });

            return new NextResponse(stream, {
                status: 200,
                headers: {
                    "Content-Length": String(fileSize),
                    "Content-Type": mimeType,
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600"
                }
            });
        }

    } catch (error) {
        console.error("Video Stream Error:", error);
        return NextResponse.json({
            error: "Failed to stream video",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
