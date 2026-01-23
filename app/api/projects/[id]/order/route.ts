import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { fileOrder } = await req.json();

        if (!Array.isArray(fileOrder)) {
            return new NextResponse("Invalid fileOrder format", { status: 400 });
        }

        const project = await prisma.project.findUnique({
            where: { id: params.id },
            include: { user: { include: { plan: true } } } // Include plan to check permissions
        });

        if (!project) {
            return new NextResponse("Project not found", { status: 404 });
        }

        // Check if user owns project
        if (project.userId !== session.user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Check if plan allows manual ordering
        const planLimits = project.user.plan?.limits ? JSON.parse(project.user.plan.limits) : null;
        if (!planLimits?.manualOrdering) {
            return new NextResponse("Upgrade plan to use manual ordering", { status: 403 });
        }

        await prisma.project.update({
            where: { id: params.id },
            data: { fileOrder },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Order Update Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
