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

        // 1. Check for special subfolders
        const subfolders = await provider.listFolders(folderId, auth);
        const webjpgFolder = subfolders.find(f => f.name.toLowerCase() === "webjpg");
        const jpgFolder = subfolders.find(f => f.name.toLowerCase() === "jpg");
        const rawFolder = subfolders.find(f => f.name.toLowerCase() === "raw");

        // 2. Decide where to pull main files from
        const sourceFolderId = webjpgFolder ? webjpgFolder.id : folderId;
        const mainFiles = await provider.listFiles(sourceFolderId, auth);

        // 3. If we have multiple formats, we need to map them
        if (webjpgFolder || jpgFolder || rawFolder) {

            // OPTIMIZED VERSION: List all relevant folders once
            const fullJpgFiles = jpgFolder ? await provider.listFiles(jpgFolder.id, auth) : [];
            const rawFiles = rawFolder ? await provider.listFiles(rawFolder.id, auth) : [];

            const jpgMap = new Map(fullJpgFiles.map(f => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), f.id]));
            // Guardamos {id, name} para RAW
            const rawMap = new Map(rawFiles.map(f => [f.name.split('.').slice(0, -1).join('.').toLowerCase(), { id: f.id, name: f.name }]));

            const enrichedFiles = mainFiles.map(file => {
                const baseKey = file.name.split('.').slice(0, -1).join('.').toLowerCase();
                const rawData = rawMap.get(baseKey);

                return {
                    ...file,
                    formats: {
                        web: file.id,
                        jpg: jpgMap.get(baseKey) || null,
                        raw: rawData || null,
                    }
                };
            });

            return NextResponse.json({
                files: enrichedFiles,
                activeProxy: !!webjpgFolder,
                foldersFound: {
                    webjpg: !!webjpgFolder,
                    jpg: !!jpgFolder,
                    raw: !!rawFolder
                }
            });
        }

        return NextResponse.json({ files: mainFiles });
    } catch (error) {
        console.error("File List Error:", error);
        return NextResponse.json({ error: "Failed to list files", details: String(error) }, { status: 500 });
    }
}
