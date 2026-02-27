import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { nanoid } from "nanoid";

const prismaAny = prisma as any;

async function canManageProject(userId: string, projectId: string) {
    const project = await prismaAny.nodosProject.findUnique({
        where: { id: projectId },
        include: { members: true },
    });

    if (!project) return false;

    // Check if owner
    if (project.ownerId === userId) return true;

    // Check if member with ADMIN role
    const member = project.members.find((m: { userId: string; role: string }) => m.userId === userId);
    return member?.role === "ADMIN";
}

// GET: List members and pending invitations
export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = params;

    try {
        const project = await prismaAny.nodosProject.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, email: true, image: true } } }
                },
                invitations: {
                    where: { status: "PENDING" }
                },
                owner: {
                    select: { id: true, name: true, email: true, image: true }
                }
            }
        });

        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        // Verify access (owner or member)
        const isOwner = project.ownerId === session.user.id;
        const isMember = project.members.some((m: { userId: string }) => m.userId === session.user.id);

        if (!isOwner && !isMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Add owner to members if not already present (virtual)
        let allMembers = [...project.members];
        if (!project.members.some((m: { userId: string }) => m.userId === project.ownerId)) {
            allMembers = [
                {
                    id: "owner",
                    projectId,
                    userId: project.ownerId,
                    role: "OWNER",
                    createdAt: project.createdAt,
                    user: project.owner
                } as any,
                ...allMembers
            ];
        }

        return NextResponse.json({ members: allMembers, invitations: project.invitations });
    } catch (error) {
        console.error("Error fetching Nodos members:", error);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}

// POST: Invite a user
export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = params;
    const body = await request.json();
    const { email, role = "VIEWER" } = body;

    if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Verify Permissions
    if (!(await canManageProject(session.user.id, projectId))) {
        return NextResponse.json({ error: "Forbidden. Only Admins can invite." }, { status: 403 });
    }

    try {
        const targetUser = await prisma.user.findUnique({ where: { email } });

        if (targetUser) {
            const project = await prismaAny.nodosProject.findUnique({ where: { id: projectId } });
            if (project?.ownerId === targetUser.id) {
                return NextResponse.json({ error: "El usuario es el dueño del proyecto" }, { status: 409 });
            }

            const existingMember = await prismaAny.nodosMember.findUnique({
                where: { projectId_userId: { projectId, userId: targetUser.id } }
            });

            if (existingMember) {
                return NextResponse.json({ error: "El usuario ya es colaborador" }, { status: 409 });
            }
        }

        // Check if invite already exists
        const existingInvite = await prismaAny.nodosInvitation.findFirst({
            where: { projectId, email, status: "PENDING" }
        });

        if (existingInvite) {
            return NextResponse.json({ error: "Invitación ya pendiente" }, { status: 409 });
        }

        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await prismaAny.nodosInvitation.create({
            data: {
                projectId,
                email,
                role,
                token,
                status: "PENDING",
                senderId: session.user.id,
                expiresAt,
            },
            include: {
                project: { select: { title: true } },
                sender: { select: { name: true, email: true } }
            }
        });

        return NextResponse.json({ invitation, type: "invitation" });
    } catch (error) {
        console.error("Error creating Nodos invitation:", error);
        return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }
}
