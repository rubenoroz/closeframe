import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ projectId: string; columnId: string }> }
) {
    try {
        const { projectId, columnId } = await params;
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify ownership
        const project = await prisma.scenaProject.findUnique({
            where: {
                id: projectId,
                ownerId: session.user.id
            }
        });

        if (!project) {
            return new NextResponse("Project not found", { status: 404 });
        }

        const body = await req.json();
        const { name, color, cardColor } = body;

        const column = await prisma.column.update({
            where: { id: columnId },
            data: {
                ...(name && { name }),
                ...(color && { color }),
                ...(cardColor && { cardColor }),
            },
        });

        return NextResponse.json(column);
    } catch (error) {
        console.error("[SCENA_COLUMN_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ projectId: string; columnId: string }> }
) {
    try {
        const { projectId, columnId } = await params;
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify ownership
        const project = await prisma.scenaProject.findUnique({
            where: {
                id: projectId,
                ownerId: session.user.id
            }
        });

        if (!project) {
            return new NextResponse("Project not found", { status: 404 });
        }

        await prisma.column.delete({
            where: { id: columnId },
        });

        return new NextResponse("Column deleted", { status: 200 });
    } catch (error) {
        console.error("[SCENA_COLUMN_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
