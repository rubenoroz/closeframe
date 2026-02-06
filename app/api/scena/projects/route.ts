import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getPlanConfig } from "@/lib/plans.config";

export const dynamic = 'force-dynamic';

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
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } }
                ],
                isArchived: archived,
            },
            select: {
                id: true,
                name: true,
                description: true,
                isArchived: true,
                updatedAt: true,
                ownerId: true,
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
            },
            orderBy: {
                updatedAt: 'desc',
            },
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

        // Get User Plan & Check Limits
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { plan: true }
        });

        const config = getPlanConfig(user?.plan?.name);

        // 1. Check Access
        if (!config.features.scenaAccess) {
            return NextResponse.json({ error: "Your plan does not have access to Scena Projects." }, { status: 403 });
        }

        // 2. Check Limits
        const limit = config.limits.maxScenaProjects; // 0 for Free
        if (limit !== -1) {
            const count = await prisma.scenaProject.count({
                where: { ownerId: session.user.id }
            });

            if (count >= limit) {
                return NextResponse.json({
                    error: `You have reached the limit of ${limit} projects for your plan.`
                }, { status: 403 });
            }
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
