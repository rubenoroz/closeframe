import { NextResponse } from "next/server";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { getFreshAuth } from "@/lib/cloud/auth-factory";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cloudAccountId = searchParams.get("cloudAccountId");
    let folderId = searchParams.get("folderId");
    const projectId = searchParams.get("projectId");

    if (!cloudAccountId || !folderId) {
        return NextResponse.json({ error: "Cloud Account ID and Folder ID required" }, { status: 400 });
    }

    try {
        // Fetch project order if projectId is provided
        let fileOrder: string[] | null = null;
        if (projectId) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { fileOrder: true }
            });
            if ((project as any)?.fileOrder) {
                fileOrder = JSON.parse(JSON.stringify((project as any).fileOrder));
            }
        }
        // Use generalized auth factory
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId }
        });

        if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

        const authClient = await getFreshAuth(cloudAccountId);

        let provider;
        let mainFiles = [];
        let activeProxy = false;
        let foldersFound = {
            webjpg: false, jpg: false, rawPhoto: false,
            webmp4: false, hd: false, rawVideo: false
        };

        if (account.provider === "microsoft") {
            const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
            // @ts-ignore
            provider = new MicrosoftGraphProvider(authClient);
            console.log("[DEBUG] Using Microsoft Provider");
        } else if (account.provider === "dropbox") {
            const { DropboxProvider } = await import("@/lib/cloud/dropbox-provider");
            // @ts-ignore
            provider = new DropboxProvider(authClient);
            console.log("[DEBUG] Using Dropbox Provider");
        } else if (account.provider === "koofr") {
            const { KoofrProvider } = await import("@/lib/cloud/koofr-provider");
            // @ts-ignore
            provider = new KoofrProvider(authClient.email, authClient.password);
        } else {
            // Default Google Logic (Default)
            provider = new GoogleDriveProvider();
            console.log("[DEBUG] Using Google Provider");
        }

        // 1. Check for special subfolders (photos AND videos)
        console.log(`[DEBUG] Listing folders for parent: ${folderId}`);
        // @ts-ignore
        let subfolders = await provider.listFolders(folderId, authClient);
        console.log(`[DEBUG] Subfolders found: ${subfolders.length}`, subfolders.map((f: any) => f.name));

        // Check if there's a "Fotografias" subfolder - if so, use it as the actual source
        const fotografiasFolder = subfolders.find((f: any) => f.name.toLowerCase() === "fotografias");
        if (fotografiasFolder) {
            folderId = fotografiasFolder.id;
            // @ts-ignore
            subfolders = await provider.listFolders(folderId, authClient);
        }

        // Photo proxies
        const webjpgFolder = subfolders.find((f: any) => f.name.toLowerCase() === "webjpg");
        const jpgFolder = subfolders.find((f: any) => f.name.toLowerCase() === "jpg");
        const rawPhotoFolder = subfolders.find((f: any) => f.name.toLowerCase() === "raw");

        console.log("[DEBUG] WebJPG folder detected:", webjpgFolder ? webjpgFolder.id : "NO");

        // Video proxies (support both old and new naming: webmp4/preview, hd/baja, raw/alta)
        const webmp4Folder = subfolders.find((f: any) =>
            f.name.toLowerCase() === "webmp4" || f.name.toLowerCase() === "preview"
        );
        const hdFolder = subfolders.find((f: any) =>
            f.name.toLowerCase() === "hd" || f.name.toLowerCase() === "baja"
        );
        const rawVideoFolder = subfolders.find((f: any) =>
            f.name.toLowerCase() === "alta"
        ) || subfolders.find((f: any) => f.name.toLowerCase() === "raw");

        // 2. Decide where to pull main files from
        // For photos: prefer webjpg, fallback to root
        // For videos: prefer webmp4, fallback to root
        const sourceFolderId = webjpgFolder ? webjpgFolder.id : (webmp4Folder ? webmp4Folder.id : folderId);
        console.log(`[DEBUG] Listing files from source: ${sourceFolderId} (Is WebJPG: ${sourceFolderId === webjpgFolder?.id})`);
        // @ts-ignore
        mainFiles = await provider.listFiles(sourceFolderId, authClient);
        console.log(`[DEBUG] Main files found: ${mainFiles.length}`);

        // Filter out system files (.keep, .DS_Store, etc)
        mainFiles = mainFiles.filter((f: any) =>
            !f.name.startsWith('.') && !f.name.endsWith('.keep')
        );

        // 3. If we have multiple formats, we need to map them
        const hasPhotoProxies = webjpgFolder || jpgFolder || rawPhotoFolder;
        const hasVideoProxies = webmp4Folder || hdFolder || rawVideoFolder;

        if (hasPhotoProxies || hasVideoProxies) {
            // OPTIMIZED VERSION: List all relevant folders once

            // Photo formats
            // @ts-ignore
            const fullJpgFiles = jpgFolder ? await provider.listFiles(jpgFolder.id, authClient) : [];
            // @ts-ignore
            const rawPhotoFiles = rawPhotoFolder ? await provider.listFiles(rawPhotoFolder.id, authClient) : [];

            // Video formats
            // @ts-ignore
            const hdVideoFiles = hdFolder ? await provider.listFiles(hdFolder.id, authClient) : [];
            // @ts-ignore
            const rawVideoFiles = rawVideoFolder ? await provider.listFiles(rawVideoFolder.id, authClient) : [];

            // Create maps for photos
            const jpgMap = new Map(fullJpgFiles.map((f: any) => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), f.id]));
            const rawPhotoMap = new Map(rawPhotoFiles.map((f: any) => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), { id: f.id, name: f.name }]));

            // Create maps for videos
            const hdVideoMap = new Map(hdVideoFiles.map((f: any) => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), f.id]));
            const rawVideoMap = new Map(rawVideoFiles.map((f: any) => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), { id: f.id, name: f.name }]));

            const enrichedFiles = mainFiles.map((file: any) => {
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

            let finalFiles = enrichedFiles || mainFiles;

            // Apply manual sorting if fileOrder exists
            if (fileOrder && Array.isArray(fileOrder) && fileOrder.length > 0) {
                const orderMap = new Map(fileOrder.map((id, index) => [id, index]));

                finalFiles.sort((a: any, b: any) => {
                    const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
                    const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
                    return indexA - indexB;
                });
            }

            return NextResponse.json({
                files: finalFiles,
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

        return NextResponse.json({
            files: mainFiles,
            activeProxy: false,
            foldersFound: {
                webjpg: !!webjpgFolder,
                jpg: !!jpgFolder,
                rawPhoto: !!rawPhotoFolder,
                webmp4: !!webmp4Folder,
                hd: !!hdFolder,
                rawVideo: !!rawVideoFolder,
            }
        });
    } catch (error: any) {
        console.error("File List Error:", error);
        console.error("Error details:", {
            message: error?.message,
            code: error?.code,
            status: error?.status,
            errors: error?.errors
        });
        return NextResponse.json({
            error: "Failed to list files",
            details: error?.message || String(error),
            code: error?.code
        }, { status: 500 });
    }
}

