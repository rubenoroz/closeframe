import { google } from "googleapis";
import { CloudFile, CloudFolder, CloudProvider } from "./types";
import { Readable } from "stream";

export class GoogleDriveProvider implements CloudProvider {
    providerId = "google";

    private getDriveClient(authSource: string | any) {
        if (typeof authSource === 'string') {
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: authSource });
            return google.drive({ version: "v3", auth });
        }
        // If it's already an auth client
        return google.drive({ version: "v3", auth: authSource });
    }

    async listFiles(folderId: string, authSource: string | any): Promise<CloudFile[]> {
        const drive = this.getDriveClient(authSource);

        // Sanitize folderId (prevent query injection)
        const safeFolderId = folderId.replace(/'/g, "\\'");

        const res = await drive.files.list({
            q: `'${safeFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, imageMediaMetadata, videoMediaMetadata, size, modifiedTime)",
            pageSize: 1000, // Increased page size for flattening efficiency
        });

        const files = res.data.files || [];

        return files.map((file) => {
            const isVideo = file.mimeType?.startsWith('video/');

            // Use Google's provided thumbnailLink when available (works better with auth)
            // For videos without thumbnailLink, try Drive's thumbnail API as fallback
            let thumbnailLink = file.thumbnailLink;
            if (!thumbnailLink && isVideo && file.id) {
                thumbnailLink = `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;
            }

            let width = isVideo ? file.videoMediaMetadata?.width : file.imageMediaMetadata?.width;
            let height = isVideo ? file.videoMediaMetadata?.height : file.imageMediaMetadata?.height;
            const rotation = file.imageMediaMetadata?.rotation;

            // [FIX] Swap dimensions if rotated 90 or 270 degrees
            if (rotation === 90 || rotation === 270) {
                const temp = width;
                width = height;
                height = temp;
            }

            return {
                id: file.id || "",
                name: file.name || "Untitled",
                mimeType: file.mimeType || "application/octet-stream",
                thumbnailLink: thumbnailLink || undefined,
                previewLink: file.webContentLink || undefined,
                downloadLink: file.webContentLink || undefined,
                webViewLink: file.webViewLink || undefined,
                width: width || undefined,
                height: height || undefined,
                lastModified: file.modifiedTime || undefined,
                duration: isVideo && file.videoMediaMetadata?.durationMillis ? Math.round(parseInt(file.videoMediaMetadata.durationMillis) / 1000) : undefined
            };
        });
    }

    async listFolders(folderId: string, authSource: string | any): Promise<CloudFolder[]> {
        const drive = this.getDriveClient(authSource);

        const safeFolderId = folderId.replace(/'/g, "\\'");

        const res = await drive.files.list({
            q: `'${safeFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            pageSize: 100,
        });

        const folders = res.data.files || [];

        return folders.map((folder) => ({
            id: folder.id || "",
            name: folder.name || "Untitled Folder",
        }));
    }

    async getFileLink(fileId: string, authSource: string | any): Promise<string> {
        const drive = this.getDriveClient(authSource);
        const res = await drive.files.get({
            fileId,
            fields: "webContentLink",
        });
        return res.data.webContentLink || "";
    }

    async getQuota(authSource: string | any): Promise<{ usage: number, limit: number }> {
        const drive = this.getDriveClient(authSource);
        const res = await drive.about.get({
            fields: "storageQuota"
        });

        const usage = parseInt(res.data.storageQuota?.usage || "0");
        const limit = parseInt(res.data.storageQuota?.limit || "0");

        return { usage, limit };
    }

    /**
     * Create a new folder inside a parent folder.
     * Returns the new folder's ID.
     */
    async createFolder(parentFolderId: string, folderName: string, authSource: string | any): Promise<string> {
        const drive = this.getDriveClient(authSource);

        const res = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId],
            },
            fields: 'id',
        });

        return res.data.id || '';
    }

    /**
     * Upload a file to a specific folder.
     * Accepts a Buffer or Readable stream.
     * Returns the new file's ID.
     */
    async uploadFile(
        folderId: string,
        fileName: string,
        mimeType: string,
        fileContent: Buffer | NodeJS.ReadableStream,
        authSource: string | any
    ): Promise<string> {
        const drive = this.getDriveClient(authSource);

        const mediaBody = Buffer.isBuffer(fileContent) ? Readable.from(fileContent) : fileContent;

        const res = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
            },
            media: {
                mimeType,
                body: mediaBody,
            },
            fields: 'id',
        });

        return res.data.id || '';
    }

    /**
     * Refresh an access token using a refresh token.
     * Returns the new access token.
     */
    async refreshAccessToken(refreshToken: string): Promise<string> {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const { credentials } = await oauth2Client.refreshAccessToken();
        return credentials.access_token || '';
    }
}
