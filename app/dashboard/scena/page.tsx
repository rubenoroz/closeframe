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

    // Check plan permissions
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { plan: true }
    });

    const userPlan = (user?.plan?.name || '').toLowerCase();
    const userRole = user?.role;

    // Get effective plan config (handles overrides if any exists implementation)
    // For now we check the static config based on plan name, or we can use a helper if available
    // Ideally: const flags = getEffectivePlanConfig(user.plan.name);
    // But let's import the helper if needed or just use the logic here.

    // Since we don't have the full features loaded here easily without importing the config:
    const { getPlanConfig } = await import("@/lib/plans.config");
    const config = getPlanConfig(user?.plan?.name);

    const isAllowed = config.features.scenaAccess || userRole === 'SUPERADMIN' || userRole === 'ADMIN';

    if (!user || !isAllowed) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h1 className="text-2xl font-bold">Acceso Restringido</h1>
                <p className="text-neutral-400 text-center max-w-md">
                    El tablero Scena no está disponible en tu plan actual.
                </p>
            </div>
        );
    }

    // No auto-creation anymore. Just redirect to list.
    // Actually, this IS the list page now. 
    // We render the ProjectList component which handles fetching.

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
            <ProjectList />
        </div>
    );
}
