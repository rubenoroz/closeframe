import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { getFreshAuth } from "@/lib/cloud/auth-factory";
import { CloserGalleryStructure, Moment, MediaItem } from "./types";
import { prisma } from "@/lib/db";

const IGNORED_FOLDERS = ["web", "webjpg", "high", "alta", "masters", "crudos", "raw", "selects"];
const VALID_EXTENSIONS = ["jpg", "jpeg", "png", "mp4", "mov"];

export class GalleryIndexer {
    private provider: GoogleDriveProvider;

    constructor() {
        this.provider = new GoogleDriveProvider();
    }

    async indexGallery(cloudAccountId: string, rootFolderId: string, projectId?: string): Promise<CloserGalleryStructure> {
        // 1. Get Auth & DB Videos Parallel
        const authClientPromise = getFreshAuth(cloudAccountId);

        const externalVideosPromise = projectId
            ? (prisma as any).externalVideo.findMany({ where: { projectId } })
            : Promise.resolve([]);

        const [authClient, externalVideos] = await Promise.all([
            authClientPromise,
            externalVideosPromise
        ]);

        // 2. List Root Contents (Folders & Files)
        const [folders, rootFiles] = await Promise.all([
            this.provider.listFolders(rootFolderId, authClient),
            this.provider.listFiles(rootFolderId, authClient)
        ]);

        const structure: CloserGalleryStructure = {
            moments: [],
            highlights: [],
            totalItems: 0
        };

        // 3. Process Root Files (Highlights)
        structure.highlights = rootFiles
            .filter(f => this.isValidFile(f.name, f.mimeType)) // Basic filter
            .map(f => this.mapFileToMediaItem(f));

        // Add root external videos (those without momentName)
        const rootExternal = externalVideos
            .filter((v: any) => !v.momentName)
            .map((v: any) => this.mapExternalToMediaItem(v));

        structure.highlights = [...structure.highlights, ...rootExternal];

        structure.totalItems += structure.highlights.length;

        // 4. Process Subfolders (Momentos)
        const project = projectId ? await prisma.project.findUnique({ where: { id: projectId }, select: { fileOrder: true, momentsOrder: true } }) : null;
        const momentFolders = folders.filter(f => !IGNORED_FOLDERS.includes(f.name.toLowerCase()));

        const momentsData = await Promise.all(momentFolders.map(async (folder, index) => {
            const files = await this.provider.listFiles(folder.id, authClient);
            const validFiles = files.filter(f => this.isValidFile(f.name, f.mimeType))
                .map(f => this.mapFileToMediaItem(f));

            // Find external videos for this moment (matching folder name)
            const momentExternal = externalVideos
                .filter((v: any) => v.momentName === folder.name)
                .map((v: any) => this.mapExternalToMediaItem(v));

            let combinedItems = [...validFiles, ...momentExternal];

            // Sort by fileOrder if exists
            if (project?.fileOrder && Array.isArray(project.fileOrder)) {
                const orderMap = new Map();
                (project.fileOrder as string[]).forEach((id, idx) => orderMap.set(id, idx));

                combinedItems.sort((a, b) => {
                    const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
                    const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
                    return idxA - idxB;
                });
            } else {
                combinedItems.sort((a, b) => a.name.localeCompare(b.name));
            }

            return {
                id: folder.id,
                name: folder.name,
                items: combinedItems,
                order: index
            } as Moment;
        }));

        // Sort moments by momentsOrder if exists
        if (project?.momentsOrder && Array.isArray(project.momentsOrder)) {
            const mOrderMap = new Map();
            (project.momentsOrder as string[]).forEach((id, idx) => mOrderMap.set(id, idx));
            structure.moments = momentsData
                .sort((a, b) => {
                    const idxA = mOrderMap.has(a.id) ? mOrderMap.get(a.id) : 999999;
                    const idxB = mOrderMap.has(b.id) ? mOrderMap.get(b.id) : 999999;
                    return idxA - idxB;
                })
                .map((m, i) => ({ ...m, order: i }));
        } else {
            structure.moments = momentsData
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((m, i) => ({ ...m, order: i }));
        }

        structure.totalItems += structure.moments.reduce((acc, m) => acc + m.items.length, 0);

        return structure;
    }

    private mapExternalToMediaItem(v: any): MediaItem {
        return {
            id: v.id,
            url: v.externalId,
            thumbnailUrl: v.thumbnail || undefined,
            name: v.title || "External Video",
            isVideo: true,
            provider: v.provider as "youtube" | "vimeo",
            providerId: v.externalId,
            duration: v.duration || 0
        };
    }

    private isValidFile(name: string, mimeType: string): boolean {
        const ext = name.split('.').pop()?.toLowerCase();
        if (!ext || !VALID_EXTENSIONS.includes(ext)) return false;

        if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) return false;

        return true;
    }

    private mapFileToMediaItem(file: any): MediaItem {
        const isVideo = file.mimeType.startsWith("video/");
        return {
            id: file.id,
            url: file.downloadLink || "",
            thumbnailUrl: file.thumbnailLink,
            name: file.name,
            width: file.width,
            height: file.height,
            isVideo: isVideo,
            provider: "drive",
            providerId: file.id
        };
    }
}
