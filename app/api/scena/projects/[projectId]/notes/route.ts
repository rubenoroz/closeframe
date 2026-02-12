
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
                },
                mentions: {
                    where: {
                        userId: user.id,
                        isRead: false
                    },
                    select: {
                        id: true
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

        // Verify access and get user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const project = await prisma.scenaProject.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    include: {
                        user: true
                    }
                },
                owner: true // Fetch owner details
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

        // Create Note
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
                },
                mentions: true
            }
        });

        // Detect and Create Mentions
        const mentionsToCreate = [];
        const contentLower = content.toLowerCase();

        // Helper to check mention
        const checkMention = (name: string | null, email: string) => {
            if (name && contentLower.includes(`@${name.toLowerCase()}`)) return true;
            if (contentLower.includes(`@${email.toLowerCase()}`)) return true;
            return false;
        };

        // Check project members
        for (const member of project.members) {
            if (member.userId === user.id) continue;
            if (checkMention(member.user.name, member.user.email)) {
                mentionsToCreate.push({
                    noteId: note.id,
                    userId: member.userId
                });
            }
        }

        // Check Owner (if not already checked as member and not self)
        if (project.ownerId !== user.id) {
            const ownerIsMember = project.members.some(m => m.userId === project.ownerId);
            if (!ownerIsMember && project.owner) {
                if (checkMention(project.owner.name, project.owner.email)) {
                    mentionsToCreate.push({
                        noteId: note.id,
                        userId: project.ownerId
                    });
                }
            }
        }

        if (mentionsToCreate.length > 0) {
            await (prisma as any).noteMention.createMany({
                data: mentionsToCreate,
                skipDuplicates: true
            });
        }

        return NextResponse.json(note);

    } catch (error) {
        console.error("Error creating note:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
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

        // Get user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Mark all mentions in this project for this user as read
        // 1. Find notes in this project
        // 2. Update NoteMention where note.projectId == projectId AND userId == user.id

        await (prisma as any).noteMention.updateMany({
            where: {
                userId: user.id,
                note: {
                    projectId: projectId
                },
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error updating mentions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
