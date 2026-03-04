import { CloudFile, CloudFolder, CloudProvider } from "./types";

export class MicrosoftGraphProvider implements CloudProvider {
    providerId = "microsoft";
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    async listFolders(parentId: string = 'root', accessToken?: string): Promise<CloudFolder[]> {
        const token = accessToken || this.accessToken;
        try {
            // If root, we use the special alias 'root', otherwise the item ID
            const endpoint = parentId === 'root'
                ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
                : `https://graph.microsoft.com/v1.0/me/drive/items/${parentId}/children`;

            // Filter for folders only using OData
            const url = `${endpoint}?$filter=folder ne null&$select=id,name,folder,parentReference`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                console.error("Microsoft Graph Error (Folders):", error);
                throw new Error(error.error?.message || "Failed to list folders");
            }

            const data = await response.json();
            return data.value.map((item: any) => ({
                id: item.id,
                name: item.name,
                mimeType: "application/vnd.google-apps.folder", // Using Google's naming for consistency in frontend
                parents: [item.parentReference?.id]
            }));

        } catch (error) {
            console.error("Microsoft Provider Error:", error);
            return [];
        }
    }

    async listFiles(folderId: string, accessToken?: string): Promise<CloudFile[]> {
        const token = accessToken || this.accessToken;
        try {
            const endpoint = folderId === 'root'
                ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
                : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

            // Filter for files (folder eq null) and get thumbnails
            const url = `${endpoint}?$select=id,name,file,image,video,size,webUrl,mimeType,thumbnails,folder&$expand=thumbnails`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                console.error("Microsoft Graph Error (Files):", error);

                // Fallback: Try without OData filter/expand if it fails (sometimes personal folders are finicky)
                if (response.status === 400) {
                    const fallbackUrl = `${endpoint}?$select=id,name,file,image,video,size,webUrl,mimeType,folder`;
                    const fallbackRes = await fetch(fallbackUrl, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (fallbackRes.ok) {
                        const fallData = await fallbackRes.json();
                        return this.mapGraphItemsToCloudFiles(fallData.value);
                    }
                }

                throw new Error(error.error?.message || "Failed to list files");
            }

            const data = await response.json();
            return this.mapGraphItemsToCloudFiles(data.value);

        } catch (error) {
            console.error("Microsoft Provider Error (Files):", error);
            return [];
        }
    }

    private mapGraphItemsToCloudFiles(items: any[]): CloudFile[] {
        if (!items) return [];

        // Filter out folders manually
        const filesOnly = items.filter((item: any) => !item.folder);

        return filesOnly.map((item: any) => {
            // Determine width/height if available
            let width = item.image?.width || item.video?.width;
            let height = item.image?.height || item.video?.height;

            // Get largest thumbnail
            let thumbnailUrl = null;
            if (item.thumbnails && item.thumbnails.length > 0) {
                const thumb = item.thumbnails[0];
                thumbnailUrl = thumb.large?.url || thumb.medium?.url || thumb.small?.url;
            }

            return {
                id: item.id,
                name: item.name,
                mimeType: item.file?.mimeType || item.mimeType || "application/octet-stream",
                size: item.size,
                thumbnailLink: thumbnailUrl, // Direct link to thumbnail
                width: width || undefined,
                height: height || undefined,
                previewLink: item.webUrl,
                webViewLink: item.webUrl
            };
        });
    }

    async getThumbnail(fileId: string, accessToken?: string): Promise<string | null> {
        const token = accessToken || this.accessToken;
        try {
            const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/thumbnails`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return null;

            const data = await response.json();
            if (data.value && data.value.length > 0) {
                const thumb = data.value[0];
                // Prefer large, then medium
                return thumb.large?.url || thumb.medium?.url || thumb.small?.url;
            }
            return null;
        } catch (e) {
            console.error("Error getting thumbnail", e);
            return null;
        }
    }

    async getFileLink(fileId: string, accessToken?: string): Promise<string> {
        const token = accessToken || this.accessToken;
        try {
            const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return "";

            const data = await response.json();
            // @microsoft.graph.downloadUrl contains a short-lived URL for content
            return data["@microsoft.graph.downloadUrl"] || "";
        } catch (e) {
            console.error("Error getting file link", e);
            return "";
        }
    }

    async getQuota(accessToken?: string) {
        const token = accessToken || this.accessToken;
        try {
            const response = await fetch("https://graph.microsoft.com/v1.0/me/drive", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return null;

            const data = await response.json();

            if (data.quota) {
                return {
                    usage: data.quota.used,
                    limit: data.quota.total
                };
            }
            return null;
        } catch (e) {
            console.error("Microsoft Quota Error:", e);
            return null;
        }
    }
}
