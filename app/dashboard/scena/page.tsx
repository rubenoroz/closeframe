import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProjectList } from "@/components/scena/ProjectList";

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
    const isAllowed = ['studio', 'agency'].includes(userPlan) || userRole === 'SUPERADMIN' || userRole === 'ADMIN';

    if (!user || !isAllowed) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h1 className="text-2xl font-bold">Acceso Restringido</h1>
                <p className="text-neutral-400 text-center max-w-md">
                    El tablero Scena está disponible exclusivamente para planes Studio y Agency.
                </p>
            </div>
        );
    }

    // No auto-creation anymore. Just redirect to list.
    // Actually, this IS the list page now. 
    // We render the ProjectList component which handles fetching.

    return <ProjectList />;
}
