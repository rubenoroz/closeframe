import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { YouTube } from "@/lib/cloud/youtube";
import { VimeoClient } from "@/lib/cloud/vimeo";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const session = await auth();
    if (!session || !session.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { provider } = await params;
    const userId = session.user.id;

    let authUrl = "";

    try {
        if (provider === "youtube") {
            authUrl = YouTube.getAuthUrl(userId);
        } else if (provider === "vimeo") {
            authUrl = VimeoClient.getAuthUrl(userId);
        } else {
            return new NextResponse("Invalid provider", { status: 400 });
        }

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error(`Error initiating ${provider} auth:`, error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
