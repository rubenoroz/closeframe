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
        let thumbnailUrl = providedThumbnail;

        if (!thumbnailUrl) {
            // Get file metadata with thumbnail
            const fileMeta = await drive.files.get({
                fileId: fileId,
                fields: "thumbnailLink,mimeType"
            });
            thumbnailUrl = fileMeta.data.thumbnailLink || null;
        }

        // If no thumbnail link, construct one
        if (!thumbnailUrl) {
            thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
        } else {
            // Adjust size in the thumbnail URL
            thumbnailUrl = thumbnailUrl.replace(/=s\d+/, `=s${size}`);
        }

        // Fetch the thumbnail with auth
        const response = await fetch(thumbnailUrl, {
            headers: {
                'Authorization': `Bearer ${tokenInfo.token || account.accessToken}`
            }
        });

        if (!response.ok) {
            // Fallback: try direct fetch without auth (some thumbnails are public)
            const fallbackResponse = await fetch(thumbnailUrl);
            if (fallbackResponse.ok) {
                const buffer = await fallbackResponse.arrayBuffer();
                return new NextResponse(buffer, {
                    headers: {
                        "Content-Type": fallbackResponse.headers.get("Content-Type") || "image/jpeg",
                        "Cache-Control": "public, max-age=86400", // Cache 24h
                    }
                });
            }

            // Final fallback: Download original and resize with Sharp
            console.log(`[Thumbnail] Google thumbnail failed for ${fileId}, using Sharp fallback`);
            try {
                const originalFile = await drive.files.get(
                    { fileId: fileId, alt: "media" },
                    { responseType: "arraybuffer" }
                );

                const resized = await sharp(Buffer.from(originalFile.data as ArrayBuffer))
                    .resize({
                        width: parseInt(size),
                        height: parseInt(size),
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .toFormat('webp', { quality: 80 })
                    .toBuffer();

                return new NextResponse(new Uint8Array(resized), {
                    headers: {
                        "Content-Type": "image/webp",
                        "Cache-Control": "public, max-age=86400",
                    }
                });
            } catch (sharpError) {
                console.error("Sharp fallback failed:", sharpError);
                return NextResponse.json({ error: "Thumbnail not available" }, { status: 404 });
            }
        }

        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
                "Cache-Control": "public, max-age=86400", // Cache 24h
            }
        });

    } catch (error) {
        console.error("Thumbnail Proxy Error:", error);
        return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: 500 });
    }
}
