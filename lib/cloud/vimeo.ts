import { prisma } from "@/lib/db";
import { Vimeo } from "@vimeo/vimeo";

const VIMEO_CLIENT_ID = process.env.VIMEO_CLIENT_ID;
const VIMEO_CLIENT_SECRET = process.env.VIMEO_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/auth/connect/vimeo/callback`;

if (!VIMEO_CLIENT_ID || !VIMEO_CLIENT_SECRET) {
    console.warn("Vimeo credentials not configured (VIMEO_CLIENT_ID, VIMEO_CLIENT_SECRET)");
}

export const VimeoClient = {
    getAuthUrl: (userId: string) => {
        const vimeo = new Vimeo(VIMEO_CLIENT_ID!, VIMEO_CLIENT_SECRET!);
        // Scope 'public' for profile info/avatar, 'private' for private videos
        return vimeo.buildAuthorizationEndpoint(REDIRECT_URI, "public private", userId);
    },

    exchangeCode: async (code: string): Promise<any> => {
        const vimeo = new Vimeo(VIMEO_CLIENT_ID!, VIMEO_CLIENT_SECRET!);
        return new Promise((resolve, reject) => {
            vimeo.accessToken(code, REDIRECT_URI, (err, token) => {
                if (err) return reject(err);
                resolve(token);
            });
        });
    },

    getClient: async (userId: string) => {
        const account = await prisma.oAuthAccount.findFirst({
            where: { userId, provider: "vimeo" }
        });

        if (!account) throw new Error("Vimeo account not connected");

        // Vimeo tokens are long-lived directly, usually don't need refresh flow if "authenticated" scope is used properly provided access_token works. 
        // If needed, we just recreate the client with the token.
        return new Vimeo(VIMEO_CLIENT_ID!, VIMEO_CLIENT_SECRET!, account.accessToken);
    },

    listVideos: async (userId: string, page = 1, playlistId?: string) => {
        const client = await VimeoClient.getClient(userId);
        return new Promise((resolve, reject) => {
            // If playlistId (Album ID) is provided, fetch from that album; otherwise fetch all videos
            const path = playlistId ? `/me/albums/${playlistId}/videos` : "/me/videos";

            client.request({
                path,
                query: {
                    page,
                    per_page: 50,
                    sort: 'date',
                    direction: 'desc',
                    fields: "uri,name,pictures,duration"
                }
            }, (error, body) => {
                if (error) return reject(error);

                const items = body.data.map((video: any) => ({
                    id: video.uri.split("/").pop(), // "videos/123456" -> "123456"
                    title: video.name,
                    thumbnail: video.pictures.sizes.find((s: any) => s.width >= 640)?.link || video.pictures.sizes[0].link,
                    duration: video.duration
                }));

                resolve({
                    items,
                    nextPage: body.paging.next ? page + 1 : null
                });
            });
        });
    },

    listPlaylists: async (userId: string) => {
        const client = await VimeoClient.getClient(userId);
        return new Promise((resolve, reject) => {
            client.request({
                path: "/me/albums",
                query: {
                    per_page: 50,
                    fields: "uri,name,metadata.connections.videos.total"
                }
            }, (error, body) => {
                if (error) return reject(error);

                const items = body.data.map((album: any) => ({
                    id: album.uri.split("/").pop(), // "albums/12345" -> "12345"
                    title: album.name,
                    count: album.metadata?.connections?.videos?.total || 0,
                    thumbnail: null // Vimeo albums don't always have a simple cover image easily accessible in this scope without more calls
                }));

                resolve(items);
            });
        });
    }
};
