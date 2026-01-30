import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                cloudAccount: {
                    select: {
                        id: true,
                        provider: true,
                        email: true
                    }
                }
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Security check: ensure project belongs to user
        if (project.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ project });
    } catch (error) {
        console.error("GET Project Error:", error);
        return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
    }
}
