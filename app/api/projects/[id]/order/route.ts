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

        const { fileOrder, momentsOrder, momentsHidden } = await req.json();

        if (fileOrder && !Array.isArray(fileOrder)) {
            return new NextResponse("Invalid fileOrder format", { status: 400 });
        }

        if (momentsOrder && !Array.isArray(momentsOrder)) {
            return new NextResponse("Invalid momentsOrder format", { status: 400 });
        }

        if (momentsHidden && !Array.isArray(momentsHidden)) {
            return new NextResponse("Invalid momentsHidden format", { status: 400 });
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

        // Check if plan allows manual ordering OR if it is a Closer Gallery (Premium)
        const planLimits = project.user.plan?.limits ? JSON.parse(project.user.plan.limits) : null;
        const isCloser = project.isCloserGallery;

        if (!planLimits?.manualOrdering && !isCloser) {
            return new NextResponse("Upgrade plan to use manual ordering", { status: 403 });
        }

        const updateData: any = {};
        if (fileOrder) updateData.fileOrder = fileOrder;
        if (momentsOrder) updateData.momentsOrder = momentsOrder;
        if (momentsHidden) updateData.momentsHidden = momentsHidden; // [NEW] Save hidden moments

        await prisma.project.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Order Update Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
