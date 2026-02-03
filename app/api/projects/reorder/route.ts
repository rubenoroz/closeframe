import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { orderedIds } = body;

        if (!Array.isArray(orderedIds)) {
            return new NextResponse("Invalid request: orderedIds must be an array", { status: 400 });
        }

        // Update each project's order in a transaction
        // Since Prisma doesn't support bulk update with different values efficiently yet,
        // we'll loop through parallel promises or transaction

        await prisma.$transaction(
            orderedIds.map((id: string, index: number) =>
                prisma.project.updateMany({
                    where: {
                        id,
                        userId: session!.user!.id!
                    },
                    data: {
                        profileOrder: index
                    }
                })
            )
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[PROJECTS_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
