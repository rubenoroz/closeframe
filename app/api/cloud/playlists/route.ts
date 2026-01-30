
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { YouTube } from "@/lib/cloud/youtube";
import { VimeoClient } from "@/lib/cloud/vimeo";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const provider = searchParams.get("provider");

        if (!provider) {
            return NextResponse.json({ error: "Provider required" }, { status: 400 });
        }

        let items: any[] = [];

        if (provider === "youtube") {
            items = await YouTube.listPlaylists(session.user.id);
        } else if (provider === "vimeo") {
            items = await VimeoClient.listPlaylists(session.user.id);
        } else {
            return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
        }

        return NextResponse.json({ items });

    } catch (error) {
        console.error("Error fetching playlists:", error);
        return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
    }
}
