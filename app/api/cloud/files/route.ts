import { NextResponse } from "next/server";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { getFreshGoogleAuth } from "@/lib/cloud/google-auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cloudAccountId = searchParams.get("cloudAccountId");
    const folderId = searchParams.get("folderId");

    if (!cloudAccountId || !folderId) {
        return NextResponse.json({ error: "Cloud Account ID and Folder ID required" }, { status: 400 });
    }

    try {
        // Use centralized auth utility to get a fresh client
        const auth = await getFreshGoogleAuth(cloudAccountId);

        const provider = new GoogleDriveProvider();

        // 1. Check for special subfolders (photos AND videos)
        const subfolders = await provider.listFolders(folderId, auth);

        // Photo proxies
        const webjpgFolder = subfolders.find(f => f.name.toLowerCase() === "webjpg");
        const jpgFolder = subfolders.find(f => f.name.toLowerCase() === "jpg");
        const rawPhotoFolder = subfolders.find(f => f.name.toLowerCase() === "raw");

        // Video proxies (support both old and new naming: webmp4/preview, hd/baja, raw/alta)
        const webmp4Folder = subfolders.find(f =>
            f.name.toLowerCase() === "webmp4" || f.name.toLowerCase() === "preview"
        );
        const hdFolder = subfolders.find(f =>
            f.name.toLowerCase() === "hd" || f.name.toLowerCase() === "baja"
        );
        const rawVideoFolder = subfolders.find(f =>
            f.name.toLowerCase() === "alta"
        ) || subfolders.find(f => f.name.toLowerCase() === "raw");

        // 2. Decide where to pull main files from
        // For photos: prefer webjpg, fallback to root
        // For videos: prefer webmp4, fallback to root
        const sourceFolderId = webjpgFolder ? webjpgFolder.id : (webmp4Folder ? webmp4Folder.id : folderId);
        const mainFiles = await provider.listFiles(sourceFolderId, auth);

        // 3. If we have multiple formats, we need to map them
        const hasPhotoProxies = webjpgFolder || jpgFolder || rawPhotoFolder;
        const hasVideoProxies = webmp4Folder || hdFolder || rawVideoFolder;

        if (hasPhotoProxies || hasVideoProxies) {
            // OPTIMIZED VERSION: List all relevant folders once

            // Photo formats
            const fullJpgFiles = jpgFolder ? await provider.listFiles(jpgFolder.id, auth) : [];
            const rawPhotoFiles = rawPhotoFolder ? await provider.listFiles(rawPhotoFolder.id, auth) : [];

            // Video formats
            const hdVideoFiles = hdFolder ? await provider.listFiles(hdFolder.id, auth) : [];
            const rawVideoFiles = rawVideoFolder ? await provider.listFiles(rawVideoFolder.id, auth) : [];

            // Create maps for photos
            const jpgMap = new Map(fullJpgFiles.map(f => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), f.id]));
            const rawPhotoMap = new Map(rawPhotoFiles.map(f => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), { id: f.id, name: f.name }]));

            // Create maps for videos
            const hdVideoMap = new Map(hdVideoFiles.map(f => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), f.id]));
            const rawVideoMap = new Map(rawVideoFiles.map(f => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), { id: f.id, name: f.name }]));

            const enrichedFiles = mainFiles.map(file => {
                const baseKey = file.name.split('.').slice(0, -1).join('.').toLowerCase();
                const isVideo = file.mimeType?.startsWith('video/');

                if (isVideo) {
                    // Video file - use video proxy maps
                    const rawData = rawVideoMap.get(baseKey);
                    return {
                        ...file,
                        formats: {
                            web: file.id, // webmp4
                            hd: hdVideoMap.get(baseKey) || null,
                            raw: rawData || null,
                        }
                    };
                } else {
                    // Photo file - use photo proxy maps
                    const rawData = rawPhotoMap.get(baseKey);
                    return {
                        ...file,
                        formats: {
                            web: file.id, // webjpg
                            jpg: jpgMap.get(baseKey) || null,
                            raw: rawData || null,
                        }
                    };
                }
            });

            return NextResponse.json({
                files: enrichedFiles,
                activeProxy: !!(webjpgFolder || webmp4Folder),
                foldersFound: {
                    // Photos
                    webjpg: !!webjpgFolder,
                    jpg: !!jpgFolder,
                    rawPhoto: !!rawPhotoFolder,
                    // Videos
                    webmp4: !!webmp4Folder,
                    hd: !!hdFolder,
                    rawVideo: !!rawVideoFolder,
                }
            });
        }

        return NextResponse.json({ files: mainFiles });
    } catch (error) {
        console.error("File List Error:", error);
        return NextResponse.json({ error: "Failed to list files", details: String(error) }, { status: 500 });
    }
}
