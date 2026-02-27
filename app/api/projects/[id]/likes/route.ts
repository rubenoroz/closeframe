import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const projectId = (await params).id;

        // Verify the project exists and likes are enabled
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, likesEnabled: true }
        });

        if (!project) {
            return NextResponse.json({ error: "Productor no encontrado" }, { status: 404 });
        }

        if (!project.likesEnabled) {
            return NextResponse.json({ likes: [] });
        }

        const likes = await prisma.photoLike.findMany({
            where: { projectId },
            select: { fileId: true }
        });

        // Map to an array of just the fileIds
        const likedFileIds = likes.map((like: { fileId: string }) => like.fileId);

        return NextResponse.json({ likes: likedFileIds });
    } catch (error) {
        console.error("Error fetching likes:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const projectId = (await params).id;
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ error: "Se requiere fileId" }, { status: 400 });
        }

        // Check project exists and allows likes
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
        }

        if (!project.likesEnabled) {
            return NextResponse.json({ error: "Los 'Me gusta' están deshabilitados para esta galería" }, { status: 403 });
        }

        // Toggle like: check if exists
        const existingLike = await prisma.photoLike.findUnique({
            where: {
                projectId_fileId: {
                    projectId,
                    fileId
                }
            }
        });

        if (existingLike) {
            // Remove like
            await prisma.photoLike.delete({
                where: { id: existingLike.id }
            });
            return NextResponse.json({ status: "removed" });
        } else {
            // Add like
            await prisma.photoLike.create({
                data: {
                    projectId,
                    fileId
                }
            });
            return NextResponse.json({ status: "added" });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
