
export class MicrosoftGraphProvider {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    async listFolders(parentId: string = 'root') {
        try {
            // If root, we use the special alias 'root', otherwise the item ID
            const endpoint = parentId === 'root'
                ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
                : `https://graph.microsoft.com/v1.0/me/drive/items/${parentId}/children`;

            // Filter for folders only using OData
            const url = `${endpoint}?$filter=folder ne null&$select=id,name,folder,parentReference`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${this.accessToken}` }
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

    async listFiles(folderId: string) {
        try {
            const endpoint = folderId === 'root'
                ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
                : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

            // Filter for files (folder eq null) and get thumbnails
            // NOTE: $filter is not always supported on personal accounts for children endpoint, so we fetch all and filter in code
            const url = `${endpoint}?$select=id,name,file,image,video,size,webUrl,mimeType,thumbnails,folder&$expand=thumbnails`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });

            if (!response.ok) {
                const error = await response.json();
                console.error("Microsoft Graph Error (Files):", error);
                throw new Error(error.error?.message || "Failed to list files");
            }

            const data = await response.json();

            // Filter out folders manually
            const filesOnly = data.value.filter((item: any) => !item.folder);

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
                    mimeType: item.mimeType,
                    size: item.size,
                    thumbnailLink: thumbnailUrl, // Direct link to thumbnail
                    imageMediaMetadata: {
                        width,
                        height
                    },
                    webViewLink: item.webUrl
                };
            });

        } catch (error) {
            console.error("Microsoft Provider Error (Files):", error);
            return [];
        }
    }

    async getThumbnail(fileId: string): Promise<string | null> {
        try {
            const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/thumbnails`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${this.accessToken}` }
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

    async getFileContent(fileId: string) {
        // Get config to find download URL
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        const data = await response.json();
        // @microsoft.graph.downloadUrl contains a short-lived URL for content
        return data["@microsoft.graph.downloadUrl"];
    }
}
