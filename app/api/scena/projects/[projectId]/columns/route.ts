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

        const columns = await prisma.column.findMany({
            where: {
                projectId: projectId,
                project: {
                    ownerId: session.user.id
                }
            },
            orderBy: {
                order: 'asc',
            }
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
