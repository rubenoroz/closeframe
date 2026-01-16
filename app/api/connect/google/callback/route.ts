import { google } from "googleapis";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    try {
        // Get logged-in user
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.redirect(new URL("/login?error=not_authenticated", request.url));
        }

        // Dynamic Redirect URI based on environment
        // Dynamic Redirect URI based on environment
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        const REDIRECT_URI = `${baseUrl}/api/connect/google/callback`;

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        console.log("[OAuth Callback] Tokens received. Keys:", Object.keys(tokens));
        console.log("[OAuth Callback] Refresh Token present:", !!tokens.refresh_token);
        if (tokens.expiry_date) {
            console.log("[OAuth Callback] Token expiry:", new Date(tokens.expiry_date));
        }

        // Get basic profile info
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const providerId = userInfo.data.id || "unknown";

        // Logic to update existing account or create new one
        const existingAccount = await prisma.cloudAccount.findFirst({
            where: {
                provider: "google",
                providerId: providerId,
                userId: session.user.id,
            },
        });

        if (existingAccount) {
            console.log("[OAuth Callback] Updating existing account:", existingAccount.id);
            // Only update refresh token if we got a new one (it might be null on re-auth without prompt=consent)
            const newRefreshToken = tokens.refresh_token || existingAccount.refreshToken;

            if (!newRefreshToken) {
                console.warn("[OAuth Callback] WARNING: No refresh token available to save!");
            }

            await prisma.cloudAccount.update({
                where: { id: existingAccount.id },
                data: {
                    accessToken: tokens.access_token || "",
                    refreshToken: newRefreshToken,
                    email: userInfo.data.email,
                    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                },
            });
        } else {
            console.log("[OAuth Callback] Creating new account");

            // Validate max cloud accounts limit
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                include: {
                    plan: true,
                    _count: { select: { cloudAccounts: true } }
                }
            });

            const planLimits = user?.plan?.limits ? JSON.parse(user.plan.limits) : null;
            const maxCloudAccounts = planLimits?.maxCloudAccounts ?? 1; // Default: 1 if no plan

            if (user && user._count.cloudAccounts >= maxCloudAccounts) {
                return NextResponse.redirect(
                    new URL(`/dashboard/clouds?error=plan_limit&message=Has alcanzado el límite de ${maxCloudAccounts} nube(s) conectada(s) de tu plan`, request.url)
                );
            }

            if (!tokens.refresh_token) {
                console.warn("[OAuth Callback] WARNING: Creating account WITHOUT refresh token!");
            }
            await prisma.cloudAccount.create({
                data: {
                    provider: "google",
                    providerId: providerId,
                    email: userInfo.data.email,
                    accessToken: tokens.access_token || "",
                    refreshToken: tokens.refresh_token,
                    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                    userId: session.user.id,
                },
            });
        }

        return NextResponse.redirect(new URL("/dashboard/clouds", request.url));
    } catch (error: any) {
        console.error("OAuth Error:", error);
        // Return JSON with error details so user can see what happened
        return NextResponse.json({
            error: "Failed to authenticate",
            details: error?.message || String(error),
            code: error?.code
        }, { status: 500 });
    }
}
