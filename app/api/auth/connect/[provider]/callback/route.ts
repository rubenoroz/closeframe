import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { YouTube } from "@/lib/cloud/youtube";
import { VimeoClient } from "@/lib/cloud/vimeo";
import { prisma } from "@/lib/db";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const session = await auth();
    if (!session || !session.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL(`/dashboard/settings?error=${error}`, request.url));
    }

    if (!code) {
        return new NextResponse("Missing code", { status: 400 });
    }

    try {
        let tokens: any = {};
        let providerAccountId = "";
        let profile: { name: string | null; image: string | null } = { name: null, image: null };

        if (provider === "youtube") {
            const tokenResponse = await YouTube.getToken(code);
            tokens = {
                access_token: tokenResponse.access_token,
                refresh_token: tokenResponse.refresh_token,
                expiry_date: tokenResponse.expiry_date
            };

            // Instantiate Google client with new tokens to get Channel ID & Profile
            const { google } = await import("googleapis");
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials(tokenResponse);
            const youtube = google.youtube({ version: "v3", auth: oauth2Client });

            const me = await youtube.channels.list({ part: ["id", "snippet"], mine: true });
            const channel = me.data.items?.[0];

            providerAccountId = channel?.id || "unknown";
            // Get profile info
            profile.name = channel?.snippet?.title || "YouTube Channel";
            profile.image = channel?.snippet?.thumbnails?.default?.url || null;

        } else if (provider === "vimeo") {
            const tokenResponse = await VimeoClient.exchangeCode(code);
            tokens = {
                access_token: tokenResponse.access_token,
                refresh_token: null, // Vimeo access tokens are long lived usually
                expiry_date: null
            };
            providerAccountId = tokenResponse.user.uri.split("/").pop(); // "users/123456" -> "123456"

            // Get profile info from Vimeo response
            profile.name = tokenResponse.user.name;
            profile.image = tokenResponse.user.pictures?.sizes?.[0]?.link || null;

        } else {
            return new NextResponse("Invalid provider", { status: 400 });
        }

        // Save to DB
        console.log(`[OAuth Callback] Saving account for provider: ${provider}, ID: ${providerAccountId}, Name: ${profile.name}`);

        await prisma.oAuthAccount.upsert({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId
                }
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                userId: session.user.id,
                name: profile.name,
                image: profile.image
            },
            create: {
                userId: session.user.id,
                provider,
                providerAccountId,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                name: profile.name,
                image: profile.image
            }
        });

        return NextResponse.redirect(new URL("/dashboard/clouds?success=connected", request.url));

    } catch (err: any) {
        console.error(`[OAuth Error] Provider: ${provider}`, err);
        // Serialize error safely
        const errorDetails = err?.message || JSON.stringify(err, Object.getOwnPropertyNames(err));
        return NextResponse.redirect(new URL(`/dashboard/clouds?error=server_error&details=${encodeURIComponent(errorDetails)}`, request.url));
    }
}
