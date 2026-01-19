import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PUT(
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
        const { items } = body; // Array of { id: string, order: number }

        if (!items || !Array.isArray(items)) {
            return new NextResponse("Invalid items", { status: 400 });
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

        // Transaction to update all columns
        await prisma.$transaction(
            items.map((item: { id: string; order: number }) =>
                prisma.column.update({
                    where: { id: item.id },
                    data: { order: item.order },
                })
            )
        );

        return new NextResponse("Columns reordered", { status: 200 });
    } catch (error) {
        console.error("[SCENA_COLUMNS_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
