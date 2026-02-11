import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const session = await auth();
        const { projectId } = await params;

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!projectId) {
            return new NextResponse("Project ID required", { status: 400 });
        }

        // Verify ownership
        const project = await prisma.scenaProject.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return new NextResponse("Project not found", { status: 404 });
        }

        if (project.ownerId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // First, nullify all parentId references in the project's tasks
        // to avoid the self-referential NoAction constraint blocking cascade
        await prisma.task.updateMany({
            where: {
                column: { projectId },
                parentId: { not: null },
            },
            data: { parentId: null },
        });

        await prisma.scenaProject.delete({
            where: { id: projectId },
        });

        return new NextResponse(null, { status: 200 });

    } catch (error) {
        console.error("[PROJECT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
