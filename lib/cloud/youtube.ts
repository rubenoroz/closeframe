import { google } from "googleapis";
import { prisma } from "@/lib/db";

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/auth/connect/youtube/callback`;

if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    console.warn("YouTube credentials not configured (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET)");
}

const oauth2Client = new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    REDIRECT_URI
);

export const YouTube = {
    getAuthUrl: (userId: string) => {
        return oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: [
                "https://www.googleapis.com/auth/youtube.readonly"
            ],
            state: userId,
            prompt: "consent" // Force refresh token
        });
    },

    getToken: async (code: string) => {
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    },

    getClient: async (userId: string) => {
        const account = await prisma.oAuthAccount.findFirst({
            where: { userId, provider: "youtube" }
        });

        if (!account) throw new Error("YouTube account not connected");

        oauth2Client.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
            expiry_date: account.expiresAt ? account.expiresAt.getTime() : null
        });

        // Check token expiration and refresh if needed
        const now = Date.now();
        if (account.expiresAt && account.expiresAt.getTime() < now + 60000) { // 1 min buffer
            try {
                const refreshed = await oauth2Client.getAccessToken(); // This handles refresh logic internally if refresh_token is set
                if (refreshed.token) {
                    // Update DB
                    await prisma.oAuthAccount.update({
                        where: { id: account.id },
                        data: {
                            accessToken: refreshed.token,
                            expiresAt: new Date(Date.now() + 3600 * 1000) // Approx 1h
                        }
                    });
                }
            } catch (error) {
                console.error("Error refreshing YouTube token:", error);
                throw new Error("Failed to refresh YouTube token");
            }
        }

        return google.youtube({ version: "v3", auth: oauth2Client });
    },


    listVideos: async (userId: string, pageToken?: string, playlistId?: string) => {
        const youtube = await YouTube.getClient(userId);

        // 1. Determine which playlist to fetch
        let targetPlaylistId = playlistId;

        if (!targetPlaylistId) {
            // Get "Uploads" playlist if no specific playlist requested
            const channelRes = await youtube.channels.list({
                part: ["contentDetails"],
                mine: true
            });
            targetPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        }

        if (!targetPlaylistId) {
            return { items: [], nextPageToken: null };
        }

        // 2. Fetch videos from the target playlist
        const response = await youtube.playlistItems.list({
            part: ["snippet", "contentDetails"],
            playlistId: targetPlaylistId,
            maxResults: 50,
            pageToken
        });

        return {
            items: response.data.items?.map(item => ({
                id: item.contentDetails?.videoId, // In playlistItems, ID is in contentDetails or snippet.resourceId
                title: item.snippet?.title,
                thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
                publishedAt: item.snippet?.publishedAt
            })) || [],
            nextPageToken: response.data.nextPageToken
        };
    },

    listPlaylists: async (userId: string) => {
        const youtube = await YouTube.getClient(userId);
        const response = await youtube.playlists.list({
            part: ["snippet", "contentDetails"],
            mine: true,
            maxResults: 50
        });

        return response.data.items?.map(item => ({
            id: item.id,
            title: item.snippet?.title,
            thumbnail: item.snippet?.thumbnails?.medium?.url,
            count: item.contentDetails?.itemCount
        })) || [];
    }
};
