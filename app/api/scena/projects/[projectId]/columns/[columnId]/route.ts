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

        // Check Permissions
        const { verifyProjectAccess } = await import("@/lib/scena-auth");
        const { hasAccess, role, isOwner } = await verifyProjectAccess(projectId, session.user.id);

        const canEdit = isOwner || role === "EDITOR" || role === "ADMIN";

        if (!hasAccess || !canEdit) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Verify column exists
        const columnCheck = await prisma.column.findUnique({
            where: { id: columnId },
        });

        if (!columnCheck) {
            return new NextResponse("Column not found", { status: 404 });
        }

        if (columnCheck.projectId !== projectId) {
            return new NextResponse("Column does not belong to project", { status: 400 });
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

        // Check Permissions
        const { verifyProjectAccess } = await import("@/lib/scena-auth");
        const { hasAccess, role, isOwner } = await verifyProjectAccess(projectId, session.user.id);

        const canEdit = isOwner || role === "EDITOR" || role === "ADMIN";

        if (!hasAccess || !canEdit) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const columnCheck = await prisma.column.findUnique({
            where: { id: columnId },
        });

        if (!columnCheck) {
            return new NextResponse("Column not found", { status: 404 });
        }

        if (columnCheck.projectId !== projectId) {
            return new NextResponse("Column does not belong to project", { status: 400 });
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
