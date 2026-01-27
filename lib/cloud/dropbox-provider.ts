import { Dropbox } from "dropbox";

export class DropboxProvider {
    private dbx: Dropbox;

    constructor(accessToken: string) {
        this.dbx = new Dropbox({
            accessToken,
            fetch: fetch
        });
    }

    async listFolders(parentId?: string) {
        try {
            // Dropbox uses empty string for root, unlike Drive which uses specific ID
            // BUT, if parentId is provided and it's NOT root, we use it.
            // If parentId is 'root' or undefined, we use '' (empty string) for Dropbox Root.
            const path = (parentId && parentId !== 'root') ? parentId : '';

            const response = await this.dbx.filesListFolder({
                path: path,
                recursive: false
            });

            // Filter for folders only
            const folders = response.result.entries
                .filter(entry => entry['.tag'] === 'folder')
                .map(entry => ({
                    id: entry.path_lower || entry.id, // Use path_lower as ID for easier navigation
                    name: entry.name
                }));

            return folders;
        } catch (error) {
            console.error("Dropbox listFolders error:", error);
            // Handle error logic (e.g., if path not found)
            return [];
        }
    }

    async listFiles(folderId: string) {
        try {
            const path = folderId; // folderId IS the path in our abstraction

            const response = await this.dbx.filesListFolder({
                path: path,
                recursive: false,
                include_media_info: true
            });

            // Filter for files
            const files = response.result.entries
                .filter(entry => entry['.tag'] === 'file')
                // @ts-ignore - 'size' exists on FileMetadata
                .map(entry => ({
                    id: entry.id, // Use strict ID for files
                    name: entry.name,
                    mimeType: this.guessMimeType(entry.name),
                    // @ts-ignore
                    size: entry.size!.toString(),
                    // Dropbox handles thumbnails differently (batch or individual)
                    // We will set thumbnailLink to a proxy URL or use getTemporaryLink
                    // For now, let's assume we use our proxy for thumbnails
                    thumbnailLink: null,
                    // Store strict path for downloads
                    path_lower: entry.path_lower
                }));

            return files;
        } catch (error) {
            console.error("Dropbox listFiles error:", error);
            return [];
        }
    }

    async getFileContent(fileId: string) {
        try {
            // Get temporary link (valid for 4 hours)
            const response = await this.dbx.filesGetTemporaryLink({
                path: fileId
            });
            return response.result.link;
        } catch (error) {
            console.error("Dropbox getFileContent error:", error);
            return null;
        }
    }

    async getThumbnail(fileId: string) {
        try {
            // Dropbox returns binary data for thumbnails, not a link.
            // But we can use getTemporaryLink for full res.
            // For thumbnails, we'll likely use our /api/cloud/thumbnail proxy which calls this class
            // BUT, this method usually returns a URL in our interface.
            // Dropbox doesn't give public thumbnail URLs without creating shared links.

            // Getting a temporary link (even for full size) is safer/easier
            // Or we could implement a fetch logic here if needed.
            // For now, returning null tells our system to use the "Sharp Fallback" 
            // OR we can return the temp link of the full image and let Sharp resize it.

            const link = await this.getFileContent(fileId);
            return link;
        } catch (error) {
            return null;
        }
    }

    // Helper
    private guessMimeType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const map: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'zip': 'application/zip'
        };
        return map[ext || ''] || 'application/octet-stream';
    }

    async getQuota() {
        try {
            const response = await this.dbx.usersGetSpaceUsage();
            // Handle individual vs team allocation safely
            let limit = 0;
            if (response.result.allocation['.tag'] === 'individual') {
                limit = response.result.allocation.allocated;
            } else if (response.result.allocation['.tag'] === 'team') {
                limit = response.result.allocation.allocated;
            }

            return {
                usage: response.result.used,
                limit: limit
            };
        } catch (error) {
            console.error("Dropbox Quota Error:", error);
            return null;
        }
    }
}
