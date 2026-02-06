import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProjectList } from "@/components/scena/ProjectList";
import { InvitationList } from "@/components/scena/InvitationList";

export default async function ScenaPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/dashboard");
    }

    // Check plan permissions via database matrix
    const { canUseFeature, getFeatureLimit } = await import("@/lib/features/service");
    const isAllowed = await canUseFeature(session.user.id, 'scenaAccess') || (session.user.role as any) === 'SUPERADMIN' || (session.user.role as any) === 'ADMIN';

    if (!isAllowed) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h1 className="text-2xl font-bold">Acceso Restringido</h1>
                <p className="text-neutral-400 text-center max-w-md">
                    El tablero Scena no está disponible en tu plan actual.
                </p>
            </div>
        );
    }

    // Check project creation limits
    const limit = await getFeatureLimit(session.user.id, 'maxScenaProjects');
    const ownedProjectsCount = await prisma.scenaProject.count({
        where: { ownerId: session.user.id }
    });

    // Superadmins can always create. Others depend on limit.
    // limit -1 means unlimited.
    const isSuperAdmin = (session.user.role as any) === 'SUPERADMIN';
    const canCreate = isSuperAdmin || (limit === -1) || ((limit !== null) && (ownedProjectsCount < limit));

    // Fetch pending invitations
    const prismaAny = prisma as any;
    const invitations = await prismaAny.projectInvitation.findMany({
        where: {
            email: session.user.email,
            status: "PENDING"
        },
        include: {
            project: {
                select: {
                    name: true,
                    owner: { select: { name: true } }
                }
            },
            sender: {
                select: { name: true, image: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="flex flex-col h-full">
            {invitations.length > 0 && (
                <div className="p-6 pb-0">
                    <InvitationList initialInvitations={invitations} />
                </div>
            )}
            <ProjectList canCreate={canCreate} />
        </div>
    );
}
