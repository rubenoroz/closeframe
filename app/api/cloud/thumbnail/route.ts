import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import sharp from "sharp";

/**
 * Thumbnail Proxy for Multi-Cloud
 * Fetches thumbnails server-side to avoid CORS/auth issues
 * Falls back to Sharp-based resizing if provider thumbnail fails
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const cloudAccountId = searchParams.get("c");
        const fileId = searchParams.get("f");
        const size = searchParams.get("s") || "400";
        const providedThumbnail = searchParams.get("t");

        if (!cloudAccountId || !fileId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId },
        });

        if (!account || !account.accessToken) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        const { getFreshAuth } = await import("@/lib/cloud/auth-factory");
        const authClient = await getFreshAuth(cloudAccountId);

        let buffer: any = null;
        let contentType = "image/jpeg";
        let cacheControl = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";

        if (account.provider === "microsoft") {
            const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
            const provider = new MicrosoftGraphProvider(authClient as string);

            console.log(`[Thumbnail] Microsoft ID: ${fileId}`);

            if (providedThumbnail) {
                try {
                    const res = await fetch(providedThumbnail);
                    if (res.ok) {
                        buffer = await res.arrayBuffer();
                        contentType = res.headers.get("Content-Type") || contentType;
                        console.log(`[Thumbnail] Microsoft Provided success: ${buffer.byteLength} bytes`);
                    }
                } catch (e) {
                    console.warn("[Thumbnail] Microsoft provided thumbnail failed");
                }
            }

            if (!buffer) {
                const newThumbUrl = await provider.getThumbnail(fileId);
                console.log(`[Thumbnail] Microsoft GetThumbnail URL: ${newThumbUrl ? "OK" : "NONE"}`);
                if (newThumbUrl) {
                    const res = await fetch(newThumbUrl);
                    if (res.ok) {
                        buffer = await res.arrayBuffer();
                        contentType = res.headers.get("Content-Type") || contentType;
                        console.log(`[Thumbnail] Microsoft fresh link success: ${buffer.byteLength} bytes`);
                    } else {
                        console.error(`[Thumbnail] Microsoft fresh link fetch status: ${res.status}`);
                    }
                }
            }

            if (!buffer) {
                console.log(`[Thumbnail] Microsoft thumbnail not found for ${fileId}, using Sharp fallback`);
                const downloadUrl = await provider.getFileLink(fileId);
                if (downloadUrl) {
                    const res = await fetch(downloadUrl);
                    console.log(`[Thumbnail] Microsoft Sharp fallback fetch status: ${res.status}`);
                    if (res.ok) {
                        const originalBuffer = await res.arrayBuffer();
                        try {
                            const sharpBuffer = await sharp(Buffer.from(originalBuffer))
                                .rotate()
                                .resize({
                                    width: parseInt(size),
                                    height: parseInt(size),
                                    fit: 'inside',
                                    withoutEnlargement: true
                                })
                                .toFormat('webp', { quality: 80 })
                                .toBuffer();
                            buffer = new Uint8Array(sharpBuffer);
                            contentType = "image/webp";
                            console.log(`[Thumbnail] Microsoft Sharp Success: ${buffer.length} bytes`);
                        } catch (err) {
                            console.error("[Thumbnail] Microsoft Sharp resize failed:", err);
                        }
                    } else {
                        const err = await res.text();
                        console.error("[Thumbnail] Microsoft Sharp fetch error:", err.substring(0, 100));
                    }
                }
            }

        } else if (account.provider === "dropbox") {
            const { DropboxProvider } = await import("@/lib/cloud/dropbox-provider");
            const provider = new DropboxProvider(authClient as string);

            console.log(`[Thumbnail] Dropbox ID: ${fileId}`);

            if (!buffer) {
                const thumbResult = await provider.getThumbnail(fileId);
                if (thumbResult) {
                    let sourceBuffer: Buffer | null = null;

                    if (typeof thumbResult === 'string') {
                        const res = await fetch(thumbResult);
                        if (res.ok) {
                            sourceBuffer = Buffer.from(await res.arrayBuffer());
                        }
                    } else if (Buffer.isBuffer(thumbResult)) {
                        sourceBuffer = thumbResult as Buffer;
                    }

                    if (sourceBuffer) {
                        try {
                            const sharpBuffer = await sharp(sourceBuffer)
                                .rotate()
                                .resize({
                                    width: parseInt(size),
                                    height: parseInt(size),
                                    fit: 'inside',
                                    withoutEnlargement: true
                                })
                                .toFormat('webp', { quality: 80 })
                                .toBuffer();
                            buffer = new Uint8Array(sharpBuffer);
                            contentType = "image/webp";
                            console.log(`[Thumbnail] Dropbox Sharp Success: ${buffer.length} bytes`);
                        } catch (err) {
                            console.error("[Thumbnail] Dropbox Sharp resize failed:", err);
                        }
                    }
                }
            }
        }
        else if (account.provider === "koofr") {
            const { KoofrProvider } = await import("@/lib/cloud/koofr-provider");
            // @ts-ignore
            const provider = new KoofrProvider(authClient.email, authClient.password);

            console.log(`[Thumbnail] Koofr Path: ${fileId}`);

            if (!buffer) {
                const downloadUrl = await provider.getFileLink(fileId);
                console.log(`[Thumbnail] Koofr Download URL: ${downloadUrl ? "OK" : "FAILED"}`);
                if (downloadUrl) {
                    const res = await provider.fetchWithAuth(downloadUrl);
                    console.log(`[Thumbnail] Koofr Fetch Status: ${res.status}`);
                    if (res.ok) {
                        const originalBuffer = await res.arrayBuffer();
                        try {
                            const sharpBuffer = await sharp(Buffer.from(originalBuffer))
                                .rotate()
                                .resize({
                                    width: parseInt(size),
                                    height: parseInt(size),
                                    fit: 'inside',
                                    withoutEnlargement: true
                                })
                                .toFormat('webp', { quality: 80 })
                                .toBuffer();
                            buffer = new Uint8Array(sharpBuffer);
                            contentType = "image/webp";
                            console.log(`[Thumbnail] Koofr Sharp Success: ${buffer.length} bytes`);
                        } catch (err) {
                            console.error("[Thumbnail] Koofr Sharp resize failed:", err);
                        }
                    } else {
                        const errText = await res.text();
                        console.error(`[Thumbnail] Koofr Fetch Error Body: ${errText.substring(0, 100)}`);
                    }
                }
            }

        } else {
            // Google Drive
            const { google } = await import("googleapis");
            const drive = google.drive({ version: "v3", auth: authClient as any });

            let thumbnailUrl = providedThumbnail;

            if (!thumbnailUrl) {
                const fileMeta = await drive.files.get({
                    fileId: fileId,
                    fields: "thumbnailLink,mimeType"
                });
                thumbnailUrl = fileMeta.data.thumbnailLink || null;
            }

            if (!thumbnailUrl) {
                thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
            } else {
                thumbnailUrl = thumbnailUrl.replace(/=s\d+/, `=s${size}`);
            }

            const token = await authClient.getAccessToken();
            const response = await fetch(thumbnailUrl, {
                headers: { 'Authorization': `Bearer ${token.token}` }
            });

            if (response.ok) {
                buffer = await response.arrayBuffer();
                contentType = response.headers.get("Content-Type") || "image/jpeg";
            } else {
                const fallbackResponse = await fetch(thumbnailUrl);
                if (fallbackResponse.ok) {
                    buffer = await fallbackResponse.arrayBuffer();
                    contentType = fallbackResponse.headers.get("Content-Type") || "image/jpeg";
                } else {
                    console.log(`[Thumbnail] Google thumbnail failed for ${fileId}, using Sharp fallback`);
                    try {
                        const originalFile = await drive.files.get(
                            { fileId: fileId, alt: "media" },
                            { responseType: "arraybuffer" }
                        );

                        const sharpBuffer = await sharp(Buffer.from(originalFile.data as ArrayBuffer))
                            .resize({
                                width: parseInt(size),
                                height: parseInt(size),
                                fit: 'inside',
                                withoutEnlargement: true
                            })
                            .toFormat('webp', { quality: 80 })
                            .toBuffer();
                        buffer = new Uint8Array(sharpBuffer);
                        contentType = "image/webp";
                    } catch (sharpError) {
                        console.error("Sharp fallback failed:", sharpError);
                    }
                }
            }
        }

        if (!buffer) {
            return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
        }

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": cacheControl,
            }
        });

    } catch (error) {
        console.error("Thumbnail Proxy Error:", error);
        return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: 500 });
    }
}
