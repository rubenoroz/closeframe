import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

const prismaAny = prisma as any;

// Helper to check if user has permission to manage members
async function canManageProject(userId: string, projectId: string) {
    const project = await prismaAny.nodosProject.findUnique({
        where: { id: projectId },
        include: { members: true },
    });

    if (!project) return false;

    // Owner always can
    if (project.ownerId === userId) return true;

    // Admin member can
    const member = project.members.find((m: any) => m.userId === userId);
    return member?.role === "ADMIN";
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, memberId } = await params;
    const userId = session.user.id;

    // Verify Permissions
    const hasPermission = await canManageProject(userId, projectId);

    const targetMember = await prismaAny.nodosMember.findUnique({ where: { id: memberId } });
    if (!targetMember) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Security check: ensure member belongs to this project
    if (targetMember.projectId !== projectId) {
        return NextResponse.json({ error: "Member does not belong to this project" }, { status: 400 });
    }

    const isSelfRemove = targetMember.userId === userId;

    if (!hasPermission && !isSelfRemove) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await prismaAny.nodosMember.delete({
            where: { id: memberId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NODOS_MEMBER_DELETE]", error);
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, memberId } = await params;
    const userId = session.user.id;

    // Only Owners/Admins can update roles
    if (!(await canManageProject(userId, projectId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!["VIEWER", "EDITOR", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    try {
        const updatedMember = await prismaAny.nodosMember.update({
            where: { id: memberId },
            data: { role },
            include: { user: { select: { id: true, name: true, email: true, image: true } } }
        });

        return NextResponse.json({ member: updatedMember });
    } catch (error) {
        console.error("[NODOS_MEMBER_PATCH]", error);
        return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
    }
}
