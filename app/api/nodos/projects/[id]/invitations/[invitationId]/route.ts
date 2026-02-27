import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

const prismaAny = prisma as any;

async function canManageProject(userId: string, projectId: string) {
    const project = await prismaAny.nodosProject.findUnique({
        where: { id: projectId },
        include: { members: true },
    });

    if (!project) return false;
    if (project.ownerId === userId) return true;

    const member = project.members.find((m: any) => m.userId === userId);
    return member?.role === "ADMIN";
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, invitationId } = await params;

    // Verify Permissions
    if (!(await canManageProject(session.user.id, projectId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const invitation = await prismaAny.nodosInvitation.findUnique({
            where: { id: invitationId }
        });

        if (!invitation || invitation.projectId !== projectId) {
            return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
        }

        await prismaAny.nodosInvitation.delete({
            where: { id: invitationId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NODOS_INVITATION_DELETE]", error);
        return NextResponse.json({ error: "Failed to cancel invitation" }, { status: 500 });
    }
}
