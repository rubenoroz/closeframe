import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { MicrosoftGraphProvider } from "@/lib/cloud/microsoft-provider";
import { DropboxProvider } from "@/lib/cloud/dropbox-provider";
import { KoofrProvider } from "@/lib/cloud/koofr-provider";
import { getFreshAuth } from "@/lib/cloud/auth-factory";
import { CloserGalleryStructure, Moment, MediaItem } from "./types";
import { prisma } from "@/lib/db";
import { CloudProvider } from "../cloud/types";

const IGNORED_FOLDERS = ["web", "webjpg", "high", "alta", "masters", "crudos", "raw", "selects"];
const VALID_EXTENSIONS = ["jpg", "jpeg", "png", "mp4", "mov"];

export class GalleryIndexer {
    private async getProvider(cloudAccountId: string): Promise<{ provider: CloudProvider, authClient: any }> {
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId },
        });

        if (!account) throw new Error("Cuenta de nube no encontrada");

        const authClient = await getFreshAuth(cloudAccountId);
        let provider: CloudProvider;

        switch (account.provider) {
            case "google":
                provider = new GoogleDriveProvider();
                break;
            case "microsoft":
                provider = new MicrosoftGraphProvider(authClient as string);
                break;
            case "dropbox":
                provider = new DropboxProvider(authClient as string);
                break;
            case "koofr":
                provider = new KoofrProvider(authClient.email, authClient.password);
                break;
            default:
                throw new Error(`Proveedor ${account.provider} no soportado para indexación`);
        }

        return { provider, authClient };
    }

    async indexGallery(cloudAccountId: string, rootFolderId: string, projectId?: string): Promise<CloserGalleryStructure> {
        // 1. Get Provider & Auth
        const { provider, authClient } = await this.getProvider(cloudAccountId);

        // 2. Get DB Videos Parallel
        const externalVideos = projectId
            ? await (prisma as any).externalVideo.findMany({ where: { projectId } })
            : [];

        // 3. List Root Contents (Folders & Files)
        const [folders, rootFiles] = await Promise.all([
            provider.listFolders(rootFolderId, authClient),
            provider.listFiles(rootFolderId, authClient)
        ]);

        const structure: CloserGalleryStructure = {
            moments: [],
            highlights: [],
            totalItems: 0
        };

        // 4. Process Root Files (Highlights)
        structure.highlights = rootFiles
            .filter(f => this.isValidFile(f.name, f.mimeType)) // Basic filter
            .map(f => this.mapFileToMediaItem(f, provider.providerId));

        // Add root external videos (those without momentName)
        const rootExternal = externalVideos
            .filter((v: any) => !v.momentName)
            .map((v: any) => this.mapExternalToMediaItem(v));

        structure.highlights = [...structure.highlights, ...rootExternal];

        structure.totalItems += structure.highlights.length;

        // 5. Process Subfolders (Momentos)
        const project = projectId ? await prisma.project.findUnique({ where: { id: projectId }, select: { fileOrder: true, momentsOrder: true, momentsHidden: true } }) : null;
        const momentFolders = folders.filter(f => !IGNORED_FOLDERS.includes(f.name.toLowerCase()));

        const momentsData = await Promise.all(momentFolders.map(async (folder, index) => {
            const files = await provider.listFiles(folder.id, authClient);
            const validFiles = files.filter(f => this.isValidFile(f.name, f.mimeType))
                .map(f => this.mapFileToMediaItem(f, provider.providerId));

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

        // Filter hidden moments
        const hiddenSet = new Set((project?.momentsHidden as string[]) || []);

        // Sort moments by momentsOrder if exists
        if (project?.momentsOrder && Array.isArray(project.momentsOrder)) {
            const mOrderMap = new Map();
            (project.momentsOrder as string[]).forEach((id, idx) => mOrderMap.set(id, idx));
            structure.moments = momentsData
                .filter(m => !hiddenSet.has(m.id))
                .sort((a, b) => {
                    const idxA = mOrderMap.has(a.id) ? mOrderMap.get(a.id) : 999999;
                    const idxB = mOrderMap.has(b.id) ? mOrderMap.get(b.id) : 999999;
                    return idxA - idxB;
                })
                .map((m, i) => ({ ...m, order: i }));
        } else {
            structure.moments = momentsData
                .filter(m => !hiddenSet.has(m.id))
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

        const isKnownMime = (mimeType || "").startsWith("image/") || (mimeType || "").startsWith("video/") || mimeType === "application/octet-stream";
        if (!isKnownMime) return false;

        return true;
    }

    private mapFileToMediaItem(file: any, providerId: string): MediaItem {
        const mime = file.mimeType || "";
        const isVideo = mime.startsWith("video/");
        return {
            id: file.id,
            url: file.downloadLink || "",
            thumbnailUrl: file.thumbnailLink,
            name: file.name,
            width: file.width,
            height: file.height,
            isVideo: isVideo,
            provider: providerId as any,
            providerId: file.id
        };
    }
}
