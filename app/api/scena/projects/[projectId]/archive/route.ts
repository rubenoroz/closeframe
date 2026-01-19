import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const session = await auth();
        const { projectId } = await params;

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { isArchived } = body;

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

        const updatedProject = await prisma.scenaProject.update({
            where: { id: projectId },
            data: { isArchived },
        });

        return NextResponse.json(updatedProject);

    } catch (error) {
        console.error("[PROJECT_ARCHIVE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
