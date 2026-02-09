
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(
    request: Request,
    props: { params: Promise<{ projectId: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projectId = params.projectId;

        // Verify access
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const project = await prisma.scenaProject.findUnique({
            where: { id: projectId },
            include: {
                members: true,
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const isOwner = project.ownerId === user.id;
        const isMember = project.members.some(m => m.userId === user.id);

        if (!isOwner && !isMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Use 'any' cast to avoid build errors if prisma client isn't regenerated yet
        const notes = await (prisma as any).projectNote.findMany({
            where: { projectId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        email: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(notes);

    } catch (error) {
        console.error("Error fetching notes:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    props: { params: Promise<{ projectId: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projectId = params.projectId;
        const { content } = await request.json();

        if (!content || typeof content !== 'string' || !content.trim()) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        // Verify access
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const project = await prisma.scenaProject.findUnique({
            where: { id: projectId },
            include: {
                members: true,
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const isOwner = project.ownerId === user.id;
        const isMember = project.members.some(m => m.userId === user.id);

        if (!isOwner && !isMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const note = await (prisma as any).projectNote.create({
            data: {
                content: content.trim(),
                projectId,
                userId: user.id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        email: true,
                    }
                }
            }
        });

        return NextResponse.json(note);

    } catch (error) {
        console.error("Error creating note:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
