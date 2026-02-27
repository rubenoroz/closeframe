import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
const prismaAny = prisma as any;
import { auth } from "@/auth";

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    try {
        // Find invitation
        const invitation = await prismaAny.nodosInvitation.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!invitation) {
            return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
        }

        if (invitation.status !== "PENDING") {
            return NextResponse.json({ error: "La invitación ya no es válida" }, { status: 400 });
        }

        if (new Date() > invitation.expiresAt) {
            return NextResponse.json({ error: "La invitación ha expirado" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        // Check email match (Optional but safer)
        if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
            return NextResponse.json({ error: "Esta invitación fue enviada a un correo diferente" }, { status: 403 });
        }

        // Transaction: Create Member, Update Invitation
        const member = await prisma.$transaction(async (txAny) => {
            const tx = txAny as any;
            // Check if already member
            const existing = await tx.nodosMember.findUnique({
                where: { projectId_userId: { projectId: invitation.projectId, userId: user.id } }
            });

            if (existing) {
                await tx.nodosInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "ACCEPTED" }
                });
                return existing;
            }

            const newMember = await tx.nodosMember.create({
                data: {
                    projectId: invitation.projectId,
                    userId: user.id,
                    role: invitation.role,
                }
            });

            await tx.nodosInvitation.update({
                where: { id: invitation.id },
                data: { status: "ACCEPTED" }
            });

            return newMember;
        });

        return NextResponse.json({ success: true, member, projectId: invitation.projectId });
    } catch (error) {
        console.error("Error accepting Nodos invitation:", error);
        return NextResponse.json({ error: "No se pudo aceptar la invitación" }, { status: 500 });
    }
}
