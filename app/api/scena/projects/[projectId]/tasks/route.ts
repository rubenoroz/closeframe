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

        // Get tasks through columns that belong to this project
        const tasks = await prisma.task.findMany({
            where: {
                column: {
                    projectId: projectId,
                    project: {
                        ownerId: session.user.id
                    }
                }
            },
            include: {
                children: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: {
                order: 'asc',
            }
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("[SCENA_TASKS_GET]", error);
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
        const { title, columnId, order, parentId, startDate, endDate, toleranceDate } = body;

        if (!title || !columnId) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Verify ownership through column -> project
        const column = await prisma.column.findUnique({
            where: { id: columnId },
            include: { project: true }
        });

        if (!column || column.project.ownerId !== session.user.id) {
            return new NextResponse("Unauthorized or column not found", { status: 401 });
        }

        // Verify column belongs to the correct project
        if (column.projectId !== projectId) {
            return new NextResponse("Column does not belong to this project", { status: 400 });
        }

        // Determine order if not provided
        let taskOrder = order;
        if (taskOrder === undefined) {
            const lastTask = await prisma.task.findFirst({
                where: { columnId },
                orderBy: { order: 'desc' }
            });
            taskOrder = lastTask ? lastTask.order + 1 : 0;
        }

        const task = await prisma.task.create({
            data: {
                title,
                columnId,
                order: taskOrder,
                parentId: parentId || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                toleranceDate: toleranceDate ? new Date(toleranceDate) : null,
            },
            include: {
                children: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error("[SCENA_TASKS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
