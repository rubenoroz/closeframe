import { NextResponse } from "next/server";
import { getFreshGoogleAuth } from "@/lib/cloud/google-auth";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cloudAccountId = searchParams.get("cloudAccountId");

    if (!cloudAccountId) {
        return NextResponse.json({ error: "Cloud Account ID required" }, { status: 400 });
    }

    try {
        const auth = await getFreshGoogleAuth(cloudAccountId);
        const provider = new GoogleDriveProvider();
        const quota = await provider.getQuota(auth);

        return NextResponse.json(quota);
    } catch (error) {
        console.error("Quota Error:", error);
        return NextResponse.json({ error: "Failed to fetch quota" }, { status: 500 });
    }
}
