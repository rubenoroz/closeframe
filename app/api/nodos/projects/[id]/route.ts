import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// GET a single project by ID
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        const project = await prisma.nodosProject.findFirst({
            where: {
                id,
                ownerId: session.user.id,
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

        // Verify ownership
        const existing = await prisma.nodosProject.findFirst({
            where: { id, ownerId: session.user.id },
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

        // Verify ownership
        const existing = await prisma.nodosProject.findFirst({
            where: { id, ownerId: session.user.id },
        });

        if (!existing) {
            return new NextResponse("Project not found", { status: 404 });
        }

        await prisma.nodosProject.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NODOS_PROJECT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
