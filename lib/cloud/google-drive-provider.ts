import { google } from "googleapis";
import { CloudFile, CloudFolder, CloudProvider } from "./types";

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

        const res = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
            fields: "files(id, name, mimeType, thumbnailLink, webContentLink, imageMediaMetadata, size, modifiedTime)",
            pageSize: 100,
        });

        const files = res.data.files || [];

        return files.map((file) => ({
            id: file.id || "",
            name: file.name || "Untitled",
            mimeType: file.mimeType || "application/octet-stream",
            thumbnailLink: file.thumbnailLink || undefined,
            previewLink: file.webContentLink || undefined,
            downloadLink: file.webContentLink || undefined,
            width: file.imageMediaMetadata?.width || undefined,
            height: file.imageMediaMetadata?.height || undefined,
            lastModified: file.modifiedTime || undefined,
        }));
    }

    async listFolders(folderId: string, authSource: string | any): Promise<CloudFolder[]> {
        const drive = this.getDriveClient(authSource);

        const res = await drive.files.list({
            q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
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
}
