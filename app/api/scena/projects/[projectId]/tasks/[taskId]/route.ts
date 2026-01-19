import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
    try {
        const { projectId, taskId } = await params;
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify the task exists and belongs to a project owned by user
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                column: {
                    include: { project: true }
                }
            }
        });

        if (!task) return new NextResponse("Task not found", { status: 404 });

        // Verify ownership through column -> project
        if (task.column.project.ownerId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();

        // Sanitize and prepare update data
        const updateData: Record<string, any> = {};

        // String fields
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.priority !== undefined) updateData.priority = body.priority;
        if (body.color !== undefined) updateData.color = body.color;
        if (body.links !== undefined) updateData.links = body.links;
        if (body.attachments !== undefined) updateData.attachments = body.attachments;
        if (body.images !== undefined) updateData.images = body.images;
        if (body.tags !== undefined) updateData.tags = body.tags;
        if (body.checklist !== undefined) updateData.checklist = body.checklist;

        // Number fields
        if (body.progress !== undefined) updateData.progress = parseInt(body.progress) || 0;
        if (body.order !== undefined) updateData.order = parseInt(body.order) || 0;

        // Boolean fields
        if (body.isHiddenInGantt !== undefined) updateData.isHiddenInGantt = Boolean(body.isHiddenInGantt);
        if (body.isArchived !== undefined) updateData.isArchived = Boolean(body.isArchived);

        // Date fields - handle null, empty string, or date value
        if (body.startDate !== undefined) {
            updateData.startDate = body.startDate ? new Date(body.startDate) : null;
        }
        if (body.endDate !== undefined) {
            updateData.endDate = body.endDate ? new Date(body.endDate) : null;
        }
        if (body.toleranceDate !== undefined) {
            updateData.toleranceDate = body.toleranceDate ? new Date(body.toleranceDate) : null;
        }

        // Relation fields
        if (body.columnId !== undefined) updateData.columnId = body.columnId;
        if (body.parentId !== undefined) updateData.parentId = body.parentId;

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                children: true
            }
        });

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error("[SCENA_TASK_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify task exists and ownership through column -> project
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                column: {
                    include: { project: true }
                },
                children: true
            }
        });

        if (!task) return new NextResponse("Task not found", { status: 404 });

        if (task.column.project.ownerId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Recursive function to delete all descendants
        async function deleteTaskWithChildren(id: string) {
            const children = await prisma.task.findMany({
                where: { parentId: id },
                select: { id: true }
            });

            // Delete all children first (recursively)
            for (const child of children) {
                await deleteTaskWithChildren(child.id);
            }

            // Then delete the task itself
            await prisma.task.delete({
                where: { id },
            });
        }

        // Start recursive deletion
        await deleteTaskWithChildren(taskId);

        return new NextResponse("Task deleted", { status: 200 });
    } catch (error) {
        console.error("[SCENA_TASK_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
