import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/projects/:id/videos - List videos
// POST /api/projects/:id/videos - Add video
// DELETE /api/projects/:id/videos - Remove video (via ?id=...)
// PATCH /api/projects/:id/videos - Reorder videos

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;

    const videos = await prisma.externalVideo.findMany({
        where: { projectId: id },
        orderBy: { order: 'asc' }
    });

    return NextResponse.json({ videos });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await context.params;
        const body = await request.json();
        const { provider, externalId, title, thumbnail, duration, momentName } = body;

        console.log(`[POST /api/projects/${id}/videos] adding/moving video:`, { provider, externalId, title });

        // [NEW] Deduplication Logic: Check if video already exists in this project
        const existingVideo = await prisma.externalVideo.findFirst({
            where: {
                projectId: id,
                provider,
                externalId
            }
        });

        if (existingVideo) {
            console.log(`[DEBUG] Video already exists (ID: ${existingVideo.id}). Moving to moment: ${momentName}`);
            const updated = await prisma.externalVideo.update({
                where: { id: existingVideo.id },
                data: {
                    momentName: momentName || "Videos",
                    // We don't change order here to avoid jumping around, 
                    // or we could move it to the end? Let's move to end of new moment.
                }
            });
            return NextResponse.json(updated);
        }

        // Get max order
        const lastVideo = await prisma.externalVideo.findFirst({
            where: { projectId: id },
            orderBy: { order: 'desc' }
        });
        const newOrder = (lastVideo?.order || 0) + 1;

        const video = await prisma.externalVideo.create({
            data: {
                projectId: id,
                provider,
                externalId,
                title,
                thumbnail,
                duration,
                momentName: momentName || "Videos",
                order: newOrder
            }
        });

        return NextResponse.json(video);
    } catch (error) {
        console.error("POST Video error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("id"); // Fixed to match frontend

    if (!videoId) return NextResponse.json({ error: "Video ID required" }, { status: 400 });

    await prisma.externalVideo.delete({
        where: { id: videoId }
    });

    return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const { videos } = body; // Array of { id, order } or just ids in order

    // Transaction to update orders? 
    // Or just naive loop. Naive loop is fine for small lists.

    if (Array.isArray(videos)) {
        for (let i = 0; i < videos.length; i++) {
            await prisma.externalVideo.update({
                where: { id: videos[i] },
                data: { order: i }
            });
        }
    }

    return NextResponse.json({ success: true });
}
