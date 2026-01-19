import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const archived = searchParams.get("archived") === "true";

        const projects = await prisma.scenaProject.findMany({
            where: {
                ownerId: session.user.id,
                isArchived: archived,
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                booking: {
                    select: {
                        id: true,
                        customerName: true,
                        date: true,
                        notes: true
                    }
                },
                columns: {
                    include: {
                        tasks: true
                    }
                },
            }
        });

        return NextResponse.json(projects);
    } catch (error) {
        console.error("[SCENA_PROJECTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { name, description, bookingId } = body;

        if (!name) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const project = await prisma.scenaProject.create({
            // Force rebuild comment
            data: {
                name,
                description,
                bookingId: bookingId || null,
                ownerId: session.user.id,
                columns: {
                    createMany: {
                        data: [
                            { name: "Por hacer", order: 0 },
                            { name: "En progreso", order: 1 },
                            { name: "Listo", order: 2 },
                        ]
                    }
                }
            },
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error("[SCENA_PROJECTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
