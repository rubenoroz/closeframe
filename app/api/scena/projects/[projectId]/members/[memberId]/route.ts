import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

// Helper to check if user has permission to manage members
async function canManageProject(userId: string, projectId: string) {
    const project = await prisma.scenaProject.findUnique({
        where: { id: projectId },
        include: { members: true },
    });

    if (!project) return false;

    // Owner always can
    if (project.ownerId === userId) return true;

    // Admin member can
    const member = project.members.find((m) => m.userId === userId);
    return member?.role === "ADMIN";
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, memberId } = await params;
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify Permissions
    const hasPermission = await canManageProject(user.id, projectId);

    // Allow user to leave logic? 
    // If not Admin, check if memberId refers to themselves (Leaving the project)
    const targetMember = await prisma.projectMember.findUnique({ where: { id: memberId } });
    if (!targetMember) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Security check: ensure member belongs to this project
    if (targetMember.projectId !== projectId) {
        return NextResponse.json({ error: "Member does not belong to this project" }, { status: 400 });
    }

    const isSelfRemove = targetMember.userId === user.id;

    if (!hasPermission && !isSelfRemove) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await prisma.projectMember.delete({
            where: { id: memberId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, memberId } = await params;

    // Only Owners/Admins can update roles
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || !(await canManageProject(user.id, projectId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!["VIEWER", "EDITOR", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    try {
        const updatedMember = await prisma.projectMember.update({
            where: { id: memberId },
            data: { role },
            include: { user: true }
        });

        return NextResponse.json({ member: updatedMember });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
    }
}
