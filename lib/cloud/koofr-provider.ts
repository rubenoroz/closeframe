
export class KoofrProvider {
    private email: string;
    private password: string; // App Password
    private baseUrl = "https://app.koofr.net";

    constructor(email: string, password: string) {
        this.email = email;
        this.password = password;
    }

    private getHeaders() {
        const auth = Buffer.from(`${this.email}:${this.password}`).toString('base64');
        return {
            "Authorization": `Basic ${auth}`
        };
    }

    private async getPrimaryMountId(): Promise<string | null> {
        try {
            const res = await fetch(`${this.baseUrl}/api/v2/mounts`, {
                headers: this.getHeaders()
            });
            if (!res.ok) return null;
            const data = await res.json();
            const mounts = data.mounts;
            // Look for the primary mount (usually type 'device' and root true, or just the first one)
            // Koofr main storage is usually the first mount or has isPrimary
            const primary = mounts.find((m: any) => m.isPrimary) || mounts[0];
            return primary ? primary.id : null;
        } catch (e) {
            console.error("Koofr getMounts error:", e);
            return null;
        }
    }

    async listFolders(parentId?: string) {
        // Koofr uses paths, not IDs. But we can treat the path as the ID.
        // If parentId is missing or "root", path is "/"

        try {
            const mountId = await this.getPrimaryMountId();
            console.log("[Koofr] listFolders - MountId:", mountId);
            if (!mountId) throw new Error("No storage mount found");

            const path = (parentId && parentId !== 'root') ? parentId : '/';
            console.log("[Koofr] listFolders - Path:", path);

            const res = await fetch(`${this.baseUrl}/api/v2/mounts/${mountId}/files/list?path=${encodeURIComponent(path)}`, {
                headers: this.getHeaders()
            });

            console.log("[Koofr] listFolders - Response Status:", res.status);

            if (!res.ok) throw new Error(`Koofr list failed: ${res.status}`);

            const data = await res.json();
            console.log("[Koofr] listFolders - Files found:", data.files?.length);

            // Filter dirs
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

    async listFiles(folderId: string) {
        try {
            const mountId = await this.getPrimaryMountId();
            if (!mountId) throw new Error("No storage mount found");

            const path = folderId; // folderId IS the full path

            const res = await fetch(`${this.baseUrl}/api/v2/mounts/${mountId}/files/list?path=${encodeURIComponent(path)}`, {
                headers: this.getHeaders()
            });

            if (!res.ok) return [];

            const data = await res.json();

            return data.files
                .filter((f: any) => f.type === 'file')
                .map((f: any) => ({
                    id: path === '/' ? `/${f.name}` : `${path}/${f.name}`, // Full path as ID
                    name: f.name,
                    mimeType: f.contentType || this.guessMimeType(f.name),
                    size: f.size.toString(),
                    thumbnailLink: null, // Koofr doesn't give public links easily without sharing
                    path_lower: path === '/' ? `/${f.name}` : `${path}/${f.name}`
                }));

        } catch (error) {
            console.error("Koofr listFiles error:", error);
            return [];
        }
    }

    async getFileContent(fileId: string) {
        // Returns a Direct Download URL
        // Koofr API: /content/api/v2/mounts/{mountId}/files/get?path=...
        // This endpoint requires Auth headers, so we can't just return the URL for the browser to use directly
        // unless we proxy it. 
        // OR we can use /api/v2/mounts/{mountId}/files/download which might give a redirect?
        // Let's check docs. Docs say /content/api/v2... downloads the file.
        // There isn't a "create temp link" API easily available without creating a shared link.

        // HOWEVER, our system usually expects a URL it can fetch() server-side (which works fine with headers?)
        // Wait, for 'download-direct' we fetch(url). If that URL needs auth, we need to pass headers.
        // Our 'download-direct' logic: const res = await fetch(downloadUrl).

        // PROBLEM: `fetch(downloadUrl)` in `route.ts` won't pass Koofr Basic Auth headers unless we modify `route.ts`.
        // SOLUTION: KoofrProvider.getFileContent should return a URL that includes the access token? 
        // No, Basic Auth doesn't work via URL params securely.

        // BETTER SOLUTION (Architecture):
        // `download-direct` and `thumbnail` currently assume receiving a public/signed URL.
        // If we return the API URL, the fetch will fail (401).

        // We will modify `download-direct` and others to ask the provider to "download" the buffer?
        // Or we implement a method in the provider `downloadBuffer(fileId)` which we already did for others implicitly?

        // Actually, `download-direct` implementation for Microsoft:
        // `const res = await fetch(downloadUrl);` Microsoft returns a pre-signed temporary URL.

        // Koofr doesn't seem to have pre-signed temp URLs for private files easily.
        // But we DO have the credentials in `route.ts`.

        // WORKAROUND:
        // Return a special object or string that we can handle?
        // No, let's look at `auth-factory.ts`. We have the credentials there.

        // Actually, I can implement `getDownloadUrl` which returns the API URL, 
        // AND I'll have to modify `download-direct/route.ts` to add headers if provider is Koofr.

        // Let's implement `getFileContent` returning the API URL.
        try {
            const mountId = await this.getPrimaryMountId();
            if (!mountId) return null;
            return `${this.baseUrl}/content/api/v2/mounts/${mountId}/files/get?path=${encodeURIComponent(fileId)}`;
        } catch (e) {
            return null;
        }
    }

    // Helper for endpoints that need to fetch with auth
    async fetchWithAuth(url: string) {
        return fetch(url, { headers: this.getHeaders() });
    }

    async getQuota() {
        try {
            // /api/v2/user/quotas
            const res = await fetch(`${this.baseUrl}/api/v2/user/quotas`, {
                headers: this.getHeaders()
            });
            const quotas = await res.json();
            // Sum up global quota? Or primary mount?
            // Usually keys are like 'primary'.
            // Let's grab the total used/total
            let used = 0;
            let limit = 0;

            // Koofr returns map: { "primary": { used, limit, ... } }
            for (const key in quotas) {
                used += quotas[key].used || 0;
                limit += quotas[key].limit || 0;
            }

            return { usage: used, limit: limit };
        } catch (error) {
            return null;
        }
    }

    private guessMimeType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const map: { [key: string]: string } = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
            'mp4': 'video/mp4', 'mov': 'video/quicktime', 'zip': 'application/zip'
        };
        return map[ext || ''] || 'application/octet-stream';
    }
}
