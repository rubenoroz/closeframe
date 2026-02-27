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

        // Find the project and check membership
        const project = await prisma.scenaProject.findUnique({
            where: { id: projectId },
            include: { members: { where: { userId: session.user.id } } }
        });

        if (!project) {
            return new NextResponse("Project not found", { status: 404 });
        }

        // If user is the owner, delete the entire project
        if (project.ownerId === session.user.id) {
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
            return new NextResponse(JSON.stringify({ success: true, action: "deleted" }), { status: 200 });
        }

        // If user is a member but not the owner, only remove their membership
        if (project.members && project.members.length > 0) {
            await (prisma as any).projectMember.delete({
                where: {
                    projectId_userId: {
                        projectId: projectId,
                        userId: session.user.id
                    }
                }
            });
            return new NextResponse(JSON.stringify({ success: true, action: "removed_membership" }), { status: 200 });
        }

        return new NextResponse("Forbidden", { status: 403 });

    } catch (error) {
        console.error("[PROJECT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
