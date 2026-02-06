import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { nanoid } from "nanoid";

// Temporary cast to avoid CI type error if generation lags
const prismaAny = prisma as any;

async function canManageProject(userId: string, projectId: string) {
    const project = await prismaAny.scenaProject.findUnique({
        where: { id: projectId },
        include: { members: true },
    });

    if (!project) return false;

    // Check if owner
    if (project.ownerId === userId) return true;

    // Check if member with ADMIN role
    const member = project.members.find((m: any) => m.userId === userId);
    return member?.role === "ADMIN";
}

// GET: List members and pending invitations
export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify access (even Viewer should see who is in the project?)
    // Let's allow any member to see the list.
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const member = await prismaAny.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
    });

    // Also allow owner
    const project = await prisma.scenaProject.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (project.ownerId !== user.id && !member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const [members, invitations] = await Promise.all([
            prismaAny.projectMember.findMany({
                where: { projectId },
                include: { user: { select: { id: true, name: true, email: true, image: true } } },
            }),
            prismaAny.projectInvitation.findMany({
                where: { projectId, status: "PENDING" },
            }),
        ]);

        return NextResponse.json({ members, invitations });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}

// POST: Invite a user (Create Member or Invitation)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();
    const { email, role = "VIEWER" } = body;

    if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const sender = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!sender) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify Permissions
    if (!(await canManageProject(sender.id, projectId))) {
        return NextResponse.json({ error: "Forbidden. Only Admins can invite." }, { status: 403 });
    }

    // Check if user already exists
    const targetUser = await prisma.user.findUnique({ where: { email } });

    // In all cases, check for existing membership first
    if (targetUser) {
        // Check if user is the OWNER
        const project = await prisma.scenaProject.findUnique({ where: { id: projectId } });
        if (project?.ownerId === targetUser.id) {
            return NextResponse.json({ error: "User is the owner of the project" }, { status: 409 });
        }

        // Check if already a member
        const existingMember = await prismaAny.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: targetUser.id } }
        });

        if (existingMember) {
            return NextResponse.json({ error: "User is already a member" }, { status: 409 });
        }
    }

    // Always create an invitation (Opt-in flow)
    try {
        // Check if invite already exists
        const existingInvite = await prismaAny.projectInvitation.findFirst({
            where: { projectId, email, status: "PENDING" }
        });

        if (existingInvite) {
            return NextResponse.json({ error: "Invitation already pending" }, { status: 409 });
        }

        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await prismaAny.projectInvitation.create({
            data: {
                projectId,
                email,
                role,
                token,
                status: "PENDING",
                senderId: sender.id,
                expiresAt,
            },
            include: {
                project: { select: { name: true } },
                sender: { select: { name: true, email: true } }
            }
        });

        // TODO: Send Invitation Email with link: /accept-invite?token=...

        return NextResponse.json({ invitation, type: "invitation" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }
}
