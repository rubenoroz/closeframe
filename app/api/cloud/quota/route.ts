import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFreshAuth } from "@/lib/cloud/auth-factory";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cloudAccountId = searchParams.get("cloudAccountId");

    if (!cloudAccountId) {
        return NextResponse.json({ error: "Cloud Account ID required" }, { status: 400 });
    }

    try {
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId }
        });

        if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

        const authClient = await getFreshAuth(cloudAccountId);
        let provider: any;

        if (account.provider === "microsoft") {
            const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
            // @ts-ignore
            provider = new MicrosoftGraphProvider(authClient);
        } else if (account.provider === "dropbox") {
            const { DropboxProvider } = await import("@/lib/cloud/dropbox-provider");
            // @ts-ignore
            provider = new DropboxProvider(authClient);
        } else {
            // Google
            provider = new GoogleDriveProvider();
        }

        // For Google, getQuota usually takes the auth client as arg.
        // For others, it's baked into the class instance via constructor.
        // We handle this difference here.
        let quota = null;
        if (account.provider === "google") {
            console.log("DEBUG: Calling Google getQuota with authClient");
            quota = await provider.getQuota(authClient);
        } else if (account.provider !== "microsoft" && account.provider !== "dropbox") {
            console.log("DEBUG: Fallback to Google getQuota with authClient (provider: " + account.provider + ")");
            quota = await provider.getQuota(authClient);
        } else {
            console.log("DEBUG: Calling Provider getQuota without args (provider: " + account.provider + ")");
            quota = await provider.getQuota();
        }

        return NextResponse.json(quota || { usage: 0, limit: 0 });
    } catch (error: any) {
        console.error("Quota Error:", error.message || error);

        // Handle expired/revoked tokens gracefully (Google, Microsoft, Dropbox)
        if (
            (error.code === 401 || error.status === 401 || error.statusCode === 401) || // Generic HTTP 401
            (error.message && (
                error.message.includes("invalid_grant") ||
                error.message.includes("invalid_request") ||
                error.message.includes("InvalidAuthenticationToken") || // Microsoft
                error.message.includes("v1/oauth2/token") || // Dropbox auth endpoint
                error.message.toLowerCase().includes("unauthorized") ||
                error.message.toLowerCase().includes("expired")
            ))
        ) {
            return NextResponse.json({
                error: "auth_expired",
                usage: 0,
                limit: 0
            }, { status: 401 });
        }

        return NextResponse.json({
            error: "Failed to fetch quota",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
