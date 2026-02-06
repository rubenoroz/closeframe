import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!projectId) {
            return new NextResponse("Project ID required", { status: 400 });
        }

        // Use helper to check access
        const { verifyProjectAccess } = await import("@/lib/scena-auth");
        const { hasAccess } = await verifyProjectAccess(projectId, session.user.id);

        if (!hasAccess) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const columns = await prisma.column.findMany({
            where: { projectId },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json(columns);
    } catch (error) {
        console.error("[SCENA_COLUMNS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { name } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Use helper to check access & permissions
        const { verifyProjectAccess } = await import("@/lib/scena-auth");
        const { hasAccess, role, isOwner } = await verifyProjectAccess(projectId, session.user.id);

        // Owners and Editors/Admins can create columns
        const canEdit = isOwner || role === "EDITOR" || role === "ADMIN";

        if (!hasAccess || !canEdit) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Get max order
        const lastColumn = await prisma.column.findFirst({
            where: { projectId },
            orderBy: { order: 'desc' }
        });

        const newOrder = lastColumn ? lastColumn.order + 1 : 0;

        const column = await prisma.column.create({
            data: {
                name,
                projectId,
                order: newOrder,
                color: "#e2e8f0",
                cardColor: "#ffffff"
            },
        });

        return NextResponse.json(column);
    } catch (error) {
        console.error("[SCENA_COLUMNS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
