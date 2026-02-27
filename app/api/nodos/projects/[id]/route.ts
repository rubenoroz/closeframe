import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const prismaAny = prisma as any;

export const dynamic = 'force-dynamic';

// GET a single project by ID
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        const project = await prismaAny.nodosProject.findFirst({
            where: {
                id,
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } }
                ],
            },
        });

        if (!project) {
            return new NextResponse("Project not found", { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error("[NODOS_PROJECT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PUT update a project (save nodes/edges)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { title, description, nodes, edges } = body;

        // Verify access (owner or member)
        const existing = await prismaAny.nodosProject.findFirst({
            where: {
                id,
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } }
                ],
            },
        });

        if (!existing) {
            return new NextResponse("Project not found", { status: 404 });
        }

        const updated = await prisma.nodosProject.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(nodes !== undefined && { nodes }),
                ...(edges !== undefined && { edges }),
                ...(body.isArchived !== undefined && { isArchived: body.isArchived }),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[NODOS_PROJECT_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE a project
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        // Find the project and check membership
        const project = await prismaAny.nodosProject.findUnique({
            where: { id },
            include: { members: { where: { userId: session.user.id } } }
        });

        if (!project) {
            return new NextResponse("Project not found", { status: 404 });
        }

        // If user is the owner, delete the entire project
        if (project.ownerId === session.user.id) {
            await prisma.nodosProject.delete({
                where: { id },
            });
            return NextResponse.json({ success: true, action: "deleted" });
        }

        // If user is a member but not the owner, only remove their membership
        if (project.members && project.members.length > 0) {
            await prismaAny.nodosMember.delete({
                where: {
                    projectId_userId: {
                        projectId: id,
                        userId: session.user.id
                    }
                }
            });
            return NextResponse.json({ success: true, action: "removed_membership" });
        }

        return new NextResponse("Forbidden", { status: 403 });
    } catch (error) {
        console.error("[NODOS_PROJECT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
