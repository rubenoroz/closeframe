
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ invitationId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id || !session.user.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        const { invitationId } = await params;
        const prismaAny = prisma as any;

        const invitation = await prismaAny.projectInvitation.findUnique({
            where: { id: invitationId }
        });

        if (!invitation) {
            return new NextResponse("Invitation not found", { status: 404 });
        }

        // Only the recipient OR the project owner/admin can delete (reject/cancel)
        // Check if user is the recipient
        const isRecipient = invitation.email === userEmail;

        if (!isRecipient) {
            // Check if user is project admin/owner
            const project = await prismaAny.scenaProject.findUnique({
                where: { id: invitation.projectId },
                include: { members: true }
            });

            const isOwner = project.ownerId === userId;
            const isAdmin = project.members.some((m: any) => m.userId === userId && m.role === "ADMIN");

            if (!isOwner && !isAdmin) {
                return new NextResponse("Forbidden", { status: 403 });
            }
        }

        await prismaAny.projectInvitation.delete({
            where: { id: invitationId }
        });

        return new NextResponse(null, { status: 200 });

    } catch (error) {
        console.error("[INVITATION_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
