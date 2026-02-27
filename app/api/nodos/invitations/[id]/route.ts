
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id || !session.user.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        // In Next.js 15, params is a Promise
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const prismaAny = prisma as any;

        const invitation = await prismaAny.nodosInvitation.findUnique({
            where: { id }
        });

        if (!invitation) {
            return new NextResponse("Invitation not found", { status: 404 });
        }

        // Only the recipient OR the project owner/admin can delete (reject/cancel)
        // Check if user is the recipient
        const isRecipient = invitation.email.toLowerCase() === userEmail.toLowerCase();

        if (!isRecipient) {
            // Check if user is project owner
            const project = await prismaAny.nodosProject.findUnique({
                where: { id: invitation.projectId },
                include: { members: true }
            });

            if (!project) {
                return new NextResponse("Project not found", { status: 404 });
            }

            const isOwner = project.ownerId === userId;
            const isAdmin = project.members.some((m: any) => m.userId === userId && m.role === "ADMIN");

            if (!isOwner && !isAdmin) {
                return new NextResponse("Forbidden", { status: 403 });
            }
        }

        await prismaAny.nodosInvitation.delete({
            where: { id }
        });

        return new NextResponse(null, { status: 200 });

    } catch (error) {
        console.error("[NODOS_INVITATION_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
