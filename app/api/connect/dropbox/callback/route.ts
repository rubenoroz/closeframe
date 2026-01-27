import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Dropbox } from "dropbox";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL("/dashboard/clouds?error=dropbox_auth_error", request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL("/dashboard/clouds?error=no_code", request.url));
    }

    // Check User Session
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const clientId = process.env.DROPBOX_CLIENT_ID;
    const clientSecret = process.env.DROPBOX_CLIENT_SECRET;

    // Construct Callback URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    const redirectUri = `${baseUrl}/api/connect/dropbox/callback`;

    try {
        // Exchange Code for Token manually (Fetch) for explicit control
        const tokenUrl = "https://api.dropboxapi.com/oauth2/token";

        const params = new URLSearchParams();
        params.append("code", code);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", redirectUri);
        params.append("client_id", clientId!);
        params.append("client_secret", clientSecret!);

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });

        const tokens = await response.json();

        if (!response.ok) {
            console.error("Dropbox Token Error:", tokens);
            throw new Error(tokens.error_description || "Failed to exchange token");
        }

        // tokens contains: access_token, token_type, uid, account_id, refresh_token, expires_in (seconds)

        // Get Account Info (email)
        // Fix: Pass 'fetch' explicitly to avoid "_this.fetch is not a function" error
        const dbx = new Dropbox({
            accessToken: tokens.access_token,
            fetch: fetch
        });
        const accountInfo = await dbx.usersGetCurrentAccount();

        const email = accountInfo.result.email;
        const accountName = accountInfo.result.name.display_name;

        // Save to DB
        // Calculate expiry date
        const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

        // Check if account already exists
        const existingAccount = await prisma.cloudAccount.findFirst({
            where: {
                provider: "dropbox",
                providerId: tokens.account_id,
                userId: session.user.id,
            },
        });

        if (existingAccount) {
            console.log("[Dropbox Callback] Updating existing account");
            await prisma.cloudAccount.update({
                where: { id: existingAccount.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || existingAccount.refreshToken, // Keep old if new is null
                    email: email,
                    name: accountName,
                    expiresAt: expiresAt
                }
            });
        } else {
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

            console.log("[Dropbox Callback] Creating new account");
            await prisma.cloudAccount.create({
                data: {
                    userId: session.user.id!, // Assert exists, checked above
                    provider: "dropbox",
                    providerId: tokens.account_id,
                    email: email,
                    name: accountName,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || null,
                    expiresAt: expiresAt
                }
            });
        }

        return NextResponse.redirect(new URL("/dashboard/clouds?success=dropbox_connected", request.url));

    } catch (err: any) {
        console.error("Dropbox Callback Error:", err);
        return NextResponse.redirect(new URL(`/dashboard/clouds?error=${encodeURIComponent(err.message)}`, request.url));
    }
}
