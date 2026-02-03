import { google } from "googleapis";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { encrypt, decrypt } from "@/lib/security/encryption";

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
            // Only update refresh token if we got a new one
            // SECURITY: Ensure we handle encryption correctly here.

            let finalRefreshToken = existingAccount.refreshToken; // DB value (could be encrypted or plain)

            if (tokens.refresh_token) {
                // New token provided -> Encrypt it
                finalRefreshToken = encrypt(tokens.refresh_token);
            } else if (existingAccount.refreshToken) {
                // No new token, keep existing.
                // OPTIONAL: Migrate to encrypted if it was plain text?
                // `decrypt` handles plain text, but good to store encrypted.
                const rawOld = decrypt(existingAccount.refreshToken);
                finalRefreshToken = encrypt(rawOld);
            }

            const encryptedAccessToken = encrypt(tokens.access_token || "");

            await prisma.cloudAccount.update({
                where: { id: existingAccount.id },
                data: {
                    accessToken: encryptedAccessToken,
                    refreshToken: finalRefreshToken,
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

            // SECURITY: Encrypt tokens
            const encryptedAccessToken = encrypt(tokens.access_token || "");
            const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

            await prisma.cloudAccount.create({
                data: {
                    provider: "google",
                    providerId: providerId,
                    email: userInfo.data.email,
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
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
