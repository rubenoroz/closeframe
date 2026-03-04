import { CloudFile, CloudFolder, CloudProvider } from "./types";

export class KoofrProvider implements CloudProvider {
    providerId = "koofr";
    private email: string;
    private password: string; // App Password
    private baseUrl = "https://app.koofr.net";

    constructor(email: string, password: string) {
        this.email = email;
        this.password = password;
    }

    public getHeaders(authSource?: any) {
        let email = this.email;
        let password = this.password;

        // If authSource is provided (from CloudProvider interface)
        if (authSource) {
            if (typeof authSource === 'object') {
                email = authSource.email || email;
                password = authSource.password || password;
            } else if (typeof authSource === 'string' && authSource.includes(':')) {
                // Support email:password string if needed
                [email, password] = authSource.split(':');
            }
        }

        const auth = Buffer.from(`${email}:${password}`).toString('base64');
        return {
            "Authorization": `Basic ${auth}`
        };
    }

    public async fetchWithAuth(url: string, options: RequestInit = {}) {
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                ...this.getHeaders()
            }
        });
    }

    private async getPrimaryMountId(authSource?: any): Promise<string | null> {
        try {
            const res = await fetch(`${this.baseUrl}/api/v2/mounts`, {
                headers: this.getHeaders(authSource)
            });

            if (!res.ok) return null;

            const data = await res.json();
            const mounts = data.mounts;
            const primary = mounts.find((m: any) => m.isPrimary) || mounts[0];

            return primary ? primary.id : null;
        } catch (e) {
            console.error("Koofr getMounts error:", e);
            return null;
        }
    }

    async listFolders(parentId?: string, authSource?: any): Promise<CloudFolder[]> {
        try {
            const mountId = await this.getPrimaryMountId(authSource);
            if (!mountId) throw new Error("No storage mount found");

            const path = (parentId && parentId !== 'root') ? parentId : '/';

            const res = await fetch(`${this.baseUrl}/api/v2/mounts/${mountId}/files/list?path=${encodeURIComponent(path)}`, {
                headers: this.getHeaders(authSource)
            });

            if (!res.ok) throw new Error(`Koofr list failed: ${res.status}`);

            const data = await res.json();

            return data.files
                .filter((f: any) => f.type === 'dir')
                .map((f: any) => ({
                    id: path === '/' ? `/${f.name}` : `${path}/${f.name}`,
                    name: f.name
                }));

        } catch (error) {
            console.error("Koofr listFolders error:", error);
            return [];
        }
    }

    async listFiles(folderId: string, authSource?: any): Promise<CloudFile[]> {
        try {
            const mountId = await this.getPrimaryMountId(authSource);
            if (!mountId) throw new Error("No storage mount found");

            const path = folderId;

            const res = await fetch(`${this.baseUrl}/api/v2/mounts/${mountId}/files/list?path=${encodeURIComponent(path)}`, {
                headers: this.getHeaders(authSource)
            });

            if (!res.ok) return [];

            const data = await res.json();

            return data.files
                .filter((f: any) => f.type === 'file')
                .map((f: any) => ({
                    id: path === '/' ? `/${f.name}` : `${path}/${f.name}`,
                    name: f.name,
                    mimeType: f.contentType || this.guessMimeType(f.name),
                    size: f.size.toString(),
                    thumbnailLink: undefined,
                    downloadLink: `${this.baseUrl}/content/api/v2/mounts/${mountId}/files/get?path=${encodeURIComponent(path === '/' ? `/${f.name}` : `${path}/${f.name}`)}`,
                    path_lower: path === '/' ? `/${f.name}` : `${path}/${f.name}`
                }));

        } catch (error) {
            console.error("Koofr listFiles error:", error);
            return [];
        }
    }

    async getFileLink(fileId: string, authSource?: any): Promise<string> {
        try {
            const mountId = await this.getPrimaryMountId(authSource);
            if (!mountId) return "";
            return `${this.baseUrl}/content/api/v2/mounts/${mountId}/files/get?path=${encodeURIComponent(fileId)}`;
        } catch (e) {
            return "";
        }
    }

    async getThumbnail(fileId: string, authSource?: any): Promise<string | null> {
        return this.getFileLink(fileId, authSource);
    }

    private guessMimeType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const map: { [key: string]: string } = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
            'mp4': 'video/mp4', 'mov': 'video/quicktime', 'zip': 'application/zip'
        };
        return map[ext || ''] || 'application/octet-stream';
    }

    async getQuota(authSource?: any) {
        try {
            const res = await fetch(`${this.baseUrl}/api/v2/user/quotas`, {
                headers: this.getHeaders(authSource)
            });
            const quotas = await res.json();
            let used = 0;
            let limit = 0;

            for (const key in quotas) {
                used += quotas[key].used || 0;
                limit += quotas[key].limit || 0;
            }

            return { usage: used, limit: limit };
        } catch (error) {
            return null;
        }
    }
}
