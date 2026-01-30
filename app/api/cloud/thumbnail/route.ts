import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import sharp from "sharp";

/**
 * Thumbnail Proxy for Google Drive
 * Fetches thumbnails server-side to avoid CORS/auth issues
 * Falls back to Sharp-based resizing if Google thumbnail fails
 * 
 * Query params:
 *   - c: cloudAccountId
 *   - f: fileId
 *   - s: size (optional, default 400)
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

        // Get cloud account
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId },
        });

        if (!account || !account.accessToken) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // 2. Get Fresh Auth Client
        const { getFreshAuth } = await import("@/lib/cloud/auth-factory");
        const authClient = await getFreshAuth(cloudAccountId);

        let buffer: any = null;
        let contentType = "image/jpeg";
        // Optimized Cache-Control: 1 day browser, 30 days Edge, background revalidation
        let cacheControl = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";

        if (account.provider === "microsoft") {
            const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
            const provider = new MicrosoftGraphProvider(authClient as string);

            // 1. Try to get provided thumbnail or fetch new one
            if (providedThumbnail) {
                try {
                    const res = await fetch(providedThumbnail);
                    if (res.ok) {
                        buffer = await res.arrayBuffer();
                        contentType = res.headers.get("Content-Type") || contentType;
                    }
                } catch (e) {
                    console.warn("Microsoft provided thumbnail failed, trying fresh link");
                }
            }

            if (!buffer) {
                const newThumbUrl = await provider.getThumbnail(fileId);
                if (newThumbUrl) {
                    const res = await fetch(newThumbUrl);
                    if (res.ok) {
                        buffer = await res.arrayBuffer();
                        contentType = res.headers.get("Content-Type") || contentType;
                    }
                }
            }

            // Fallback: Download content and resize
            if (!buffer) {
                console.log(`[Thumbnail] Microsoft thumbnail not found for ${fileId}, using Sharp fallback`);
                const downloadUrl = await provider.getFileContent(fileId);
                if (downloadUrl) {
                    const res = await fetch(downloadUrl);
                    if (res.ok) {
                        const originalBuffer = await res.arrayBuffer();
                        try {
                            // Convert Node Buffer to Uint8Array (compatible with ArrayBuffer type)
                            const sharpBuffer = await sharp(Buffer.from(originalBuffer))
                                .rotate() // Auto-rotate for Microsoft
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
                        } catch (err) {
                            console.error("Sharp resize failed:", err);
                        }
                    }
                }
            }

        } else if (account.provider === "dropbox") {
            const { DropboxProvider } = await import("@/lib/cloud/dropbox-provider");
            const provider = new DropboxProvider(authClient as string);

            // Dropbox Logic (Mirroring Microsoft)
            if (!buffer) {
                // Try getting a thumbnail link (or full file link acting as source)
                const thumbUrl = await provider.getThumbnail(fileId);
                if (thumbUrl) {
                    const res = await fetch(thumbUrl);
                    if (res.ok) {
                        // Dropbox returns full image via temp link currently, so we usually need to resize
                        // unless we implement usage of 'filesGetThumbnail' returning blob directly.
                        // For now we assume high-res link and let Sharp resize below or here.

                        // NOTE: If getThumbnail returns a small image, we can use it directly.
                        // Currently our provider returns full temp link. So we treat it as download.
                        const originalBuffer = await res.arrayBuffer();

                        // Always resize for performance since we download full res
                        try {
                            const sharpBuffer = await sharp(Buffer.from(originalBuffer))
                                .rotate() // Auto-rotate for Dropbox
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
                        } catch (err) {
                            console.error("Dropbox Sharp resize failed:", err);
                        }
                    }
                }
            }
        } else if (account.provider === "koofr") {
            const { KoofrProvider } = await import("@/lib/cloud/koofr-provider");
            // @ts-ignore
            const provider = new KoofrProvider(authClient.email, authClient.password);

            if (!buffer) {
                const downloadUrl = await provider.getFileContent(fileId);
                if (downloadUrl) {
                    const res = await provider.fetchWithAuth(downloadUrl);
                    if (res.ok) {
                        const originalBuffer = await res.arrayBuffer();
                        try {
                            const sharpBuffer = await sharp(Buffer.from(originalBuffer))
                                .rotate() // Auto-rotate for Koofr
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
                        } catch (err) {
                            console.error("Koofr Sharp resize failed:", err);
                        }
                    }
                }
            }

        } else {
            // Google Logic
            const { google } = await import("googleapis");
            const drive = google.drive({ version: "v3", auth: authClient as any });

            let thumbnailUrl = providedThumbnail;

            // ... (Existing Google Logic adapted)
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

            // Fetch the thumbnail with auth
            // NOTE: for Google we pass the token from authClient (which is an OAuth2Client)
            const token = await authClient.getAccessToken();
            const response = await fetch(thumbnailUrl, {
                headers: {
                    'Authorization': `Bearer ${token.token}`
                }
            });

            if (response.ok) {
                buffer = await response.arrayBuffer();
                contentType = response.headers.get("Content-Type") || contentType;
            } else {
                // Fallback 1: Try without auth (many Google thumbnails work directly)
                const fallbackResponse = await fetch(thumbnailUrl);
                if (fallbackResponse.ok) {
                    buffer = await fallbackResponse.arrayBuffer();
                    contentType = fallbackResponse.headers.get("Content-Type") || contentType;
                } else {
                    // Fallback 2: Sharp (expensive, but reliable)
                    console.log(`[Thumbnail] Google thumbnail failed for ${fileId}, using Sharp fallback`);
                    try {
                        const originalFile = await drive.files.get(
                            { fileId: fileId, alt: "media" },
                            { responseType: "arraybuffer" }
                        );

                        buffer = await sharp(Buffer.from(originalFile.data as ArrayBuffer))
                            .resize({
                                width: parseInt(size),
                                height: parseInt(size),
                                fit: 'inside',
                                withoutEnlargement: true
                            })
                            .toFormat('webp', { quality: 80 })
                            .toBuffer();
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
