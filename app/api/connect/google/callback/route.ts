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

        // TEMPORARY TEST: Hardcode to ensure NO spaces or weird parsing
        const REDIRECT_URI = "http://localhost:3000/api/connect/google/callback";

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

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
            await prisma.cloudAccount.update({
                where: { id: existingAccount.id },
                data: {
                    accessToken: tokens.access_token || "",
                    refreshToken: tokens.refresh_token || existingAccount.refreshToken,
                    email: userInfo.data.email,
                    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                },
            });
        } else {
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
    } catch (error) {
        console.error("OAuth Error:", error);
        return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
    }
}
