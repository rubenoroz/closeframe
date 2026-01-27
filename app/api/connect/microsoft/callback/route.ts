
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
        return NextResponse.json({ error, description: errorDescription }, { status: 400 });
    }

    if (!code) {
        return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    try {
        // Get logged-in user
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.redirect(new URL("/login?error=not_authenticated", request.url));
        }

        // Prepare token exchange
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || `${baseUrl}/api/connect/microsoft/callback`;

        const tenant = "common";
        const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

        const body = new URLSearchParams();
        body.append('client_id', process.env.MICROSOFT_CLIENT_ID!);
        body.append('scope', 'User.Read Files.Read Files.Read.All offline_access');
        body.append('code', code);
        body.append('redirect_uri', REDIRECT_URI);
        body.append('grant_type', 'authorization_code');
        body.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET!);

        console.log("[Microsoft Callback] Exchanging code for tokens...");

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error("Token exchange failed:", tokens);
            throw new Error(tokens.error_description || "Failed to exchange token");
        }

        // console.log("[Microsoft Callback] Tokens received:", tokens);
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        const expiresIn = tokens.expires_in; // in seconds
        const expiryDate = new Date(Date.now() + expiresIn * 1000);

        // Get User Profile
        const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const profile = await profileResponse.json();

        if (!profileResponse.ok) {
            throw new Error("Failed to fetch user profile");
        }

        const providerId = profile.id;
        const email = profile.mail || profile.userPrincipalName; // personal accounts often use userPrincipalName as email

        // Logic to update existing account or create new one
        const existingAccount = await prisma.cloudAccount.findFirst({
            where: {
                provider: "microsoft",
                providerId: providerId,
                userId: session.user.id,
            },
        });

        if (existingAccount) {
            console.log("[Microsoft Callback] Updating existing account:", existingAccount.id);

            await prisma.cloudAccount.update({
                where: { id: existingAccount.id },
                data: {
                    accessToken: accessToken,
                    refreshToken: refreshToken || existingAccount.refreshToken,
                    email: email,
                    expiresAt: expiryDate,
                },
            });
        } else {
            console.log("[Microsoft Callback] Creating new account");

            // Validate max cloud accounts limit
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                include: {
                    plan: true,
                    _count: { select: { cloudAccounts: true } }
                }
            });

            const planLimits = user?.plan?.limits ? JSON.parse(user.plan.limits) : null;
            const maxCloudAccounts = planLimits?.maxCloudAccounts ?? 1;

            if (user && user._count.cloudAccounts >= maxCloudAccounts) {
                return NextResponse.redirect(
                    new URL(`/dashboard/clouds?error=plan_limit&message=Has alcanzado el límite de ${maxCloudAccounts} nube(s) conectada(s) de tu plan`, request.url)
                );
            }

            await prisma.cloudAccount.create({
                data: {
                    provider: "microsoft",
                    providerId: providerId,
                    email: email,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    expiresAt: expiryDate,
                    userId: session.user.id,
                },
            });
        }

        return NextResponse.redirect(new URL("/dashboard/clouds", request.url));

    } catch (error: any) {
        console.error("Microsoft OAuth Error:", error);
        return NextResponse.json({
            error: "Failed to authenticate with Microsoft",
            details: error?.message || String(error)
        }, { status: 500 });
    }
}
