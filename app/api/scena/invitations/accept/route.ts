import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    try {
        // Find invitation
        const invitation = await prisma.projectInvitation.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!invitation) {
            return NextResponse.json({ error: "Invitation not found or invalid" }, { status: 404 });
        }

        if (invitation.status !== "PENDING") {
            return NextResponse.json({ error: "Invitation is no longer valid" }, { status: 400 });
        }

        if (new Date() > invitation.expiresAt) {
            return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
        }

        // Verify email matches user (Optional security step, but recommended)
        // Ideally we check invitation.email === session.user.email. 
        // But users might have multiple emails. For now, strict check.
        if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
            // For user friendliness we could allow claiming if logged in logic is sound, 
            // but strict email matching prevents link stealing.
            // Let's stick to strict for security.
            return NextResponse.json({ error: "This invitation was sent to a different email address." }, { status: 403 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Transaction: Create Member, Update Invitation
        const member = await prisma.$transaction(async (tx) => {
            // Check if already member
            const existing = await tx.projectMember.findUnique({
                where: { projectId_userId: { projectId: invitation.projectId, userId: user.id } }
            });

            if (existing) {
                // Already member, just close invite
                await tx.projectInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "ACCEPTED" }
                });
                return existing;
            }

            const newMember = await tx.projectMember.create({
                data: {
                    projectId: invitation.projectId,
                    userId: user.id,
                    role: invitation.role,
                }
            });

            await tx.projectInvitation.update({
                where: { id: invitation.id },
                data: { status: "ACCEPTED" }
            });

            return newMember;
        });

        return NextResponse.json({ success: true, member, projectId: invitation.projectId });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
    }
}
