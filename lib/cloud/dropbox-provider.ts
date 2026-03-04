import { Dropbox } from "dropbox";
import { CloudFile, CloudFolder, CloudProvider } from "./types";

export class DropboxProvider implements CloudProvider {
    providerId = "dropbox";
    private dbx: Dropbox;

    constructor(accessToken: string) {
        this.dbx = new Dropbox({
            accessToken,
            fetch: fetch
        });
    }

    async listFolders(parentId?: string, accessToken?: string): Promise<CloudFolder[]> {
        try {
            // If a new accessToken is provided, re-initialize (compatibility with CloudProvider interface)
            if (accessToken) {
                this.dbx = new Dropbox({ accessToken, fetch: fetch });
            }

            // Dropbox uses empty string for root
            const path = (parentId && parentId !== 'root') ? parentId : '';

            const response = await this.dbx.filesListFolder({
                path: path,
                recursive: false
            });

            // Filter for folders only
            const folders = response.result.entries
                .filter(entry => entry['.tag'] === 'folder')
                .map(entry => ({
                    id: entry.path_lower || entry.id,
                    name: entry.name
                }));

            return folders;
        } catch (error) {
            console.error("Dropbox listFolders error:", error);
            return [];
        }
    }

    async listFiles(folderId: string, accessToken?: string): Promise<CloudFile[]> {
        try {
            if (accessToken) {
                this.dbx = new Dropbox({ accessToken, fetch: fetch });
            }

            const path = folderId;

            const response = await this.dbx.filesListFolder({
                path: path,
                recursive: false,
                include_media_info: true
            });

            // Filter for files
            return response.result.entries
                .filter(entry => entry['.tag'] === 'file')
                .map(entry => {
                    const file = entry as any;
                    return {
                        id: file.id,
                        name: file.name,
                        mimeType: this.guessMimeType(file.name),
                        size: file.size?.toString(),
                        thumbnailLink: undefined,
                        downloadLink: undefined, // Will be fetched via getFileLink if needed
                        path_lower: file.path_lower
                    };
                });
        } catch (error) {
            console.error("Dropbox listFiles error:", error);
            return [];
        }
    }

    async getFileLink(fileId: string, accessToken?: string): Promise<string> {
        try {
            if (accessToken) {
                this.dbx = new Dropbox({ accessToken, fetch: fetch });
            }

            const response = await this.dbx.filesGetTemporaryLink({
                path: fileId
            });
            return response.result.link;
        } catch (error) {
            console.error("Dropbox getFileLink error:", error);
            return "";
        }
    }

    async getThumbnail(fileId: string, accessToken?: string): Promise<string | Buffer | null> {
        try {
            if (accessToken) {
                this.dbx = new Dropbox({ accessToken, fetch: fetch });
            }

            const response = await this.dbx.filesGetThumbnail({
                path: fileId,
                format: { ".tag": "jpeg" },
                size: { ".tag": "w640h480" },
                mode: { ".tag": "strict" }
            });

            const result = response.result as any;
            if (result.fileBinary) {
                return Buffer.from(result.fileBinary);
            }

            // Fallback to temporary link if binary not available (shouldn't happen with SDK)
            return this.getFileLink(fileId, accessToken);
        } catch (error) {
            console.error("Dropbox getThumbnail error:", error);
            return null;
        }
    }

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

    async getQuota(accessToken?: string) {
        try {
            if (accessToken) {
                this.dbx = new Dropbox({ accessToken, fetch: fetch });
            }

            const response = await this.dbx.usersGetSpaceUsage();
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
