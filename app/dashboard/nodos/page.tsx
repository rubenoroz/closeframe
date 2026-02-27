import { auth } from "@/auth";
import { prisma } from "@/lib/db";
const prismaAny = prisma as any;
import { redirect } from "next/navigation";
import NodosDashboardClient from "./NodosDashboardClient";
import { NodosInvitationList } from "@/components/nodos/NodosInvitationList";

export default async function NodosPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/dashboard");
    }
    const userId = session.user.id;

    // Check plan permissions
    const { canUseFeature, getFeatureLimit } = await import("@/lib/features/service");
    const isAllowed = await canUseFeature(userId, 'nodosAccess') || (session.user.role as any) === 'SUPERADMIN' || (session.user.role as any) === 'ADMIN';

    // Check project creation limits
    const limit = await getFeatureLimit(userId, 'maxNodosProjects');
    const ownedProjectsCount = await prisma.nodosProject.count({
        where: { ownerId: userId }
    });

    // Superadmins can always create. Others depend on limit.
    const isSuperAdmin = (session.user.role as any) === 'SUPERADMIN';
    const effectiveLimit = isSuperAdmin ? -1 : limit;
    const canCreate = isSuperAdmin || (effectiveLimit === -1) || ((effectiveLimit !== null) && (ownedProjectsCount < effectiveLimit));

    // Even if NOT allowed to create, they might be collaborating.
    // However, usually we show a restricted message if the feature is totally off.
    // The user said: "agregar un switch para que los usuarios no puedan crear proyectos... falta que en nodos tambien se puedan invitar a otros usuarios a colaborar... aunque no puedan crear proyectos si alguien los invita pueden colaborar"

    // So we'll allow access to the dashboard if they are allowed OR if they have projects (shared or owned).

    const count = await prismaAny.nodosProject.count({
        where: {
            OR: [
                { ownerId: userId },
                { members: { some: { userId: userId } } }
            ]
        }
    });

    // Fetch pending invitations
    const invitations = await (prisma as any).nodosInvitation.findMany({
        where: {
            email: session.user.email,
            status: "PENDING"
        },
        include: {
            project: {
                select: {
                    title: true,
                    owner: { select: { name: true } }
                }
            },
            sender: {
                select: { name: true, image: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!isAllowed && count === 0 && invitations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h1 className="text-2xl font-bold">Acceso Restringido</h1>
                <p className="text-neutral-400 text-center max-w-md">
                    El tablero Nodos no está disponible en tu plan actual.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <NodosDashboardClient
                canCreate={isAllowed && canCreate}
                limit={effectiveLimit}
                ownedCount={ownedProjectsCount}
                initialInvitations={invitations}
            />
        </div>
    );
}
