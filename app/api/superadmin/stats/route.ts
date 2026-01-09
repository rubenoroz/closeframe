import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin";

export async function GET() {
    // Verificar autorización
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        // Fecha hace 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Obtener todas las estadísticas en paralelo
        const [
            totalUsers,
            activeUsers,
            totalProjects,
            totalCloudAccounts,
            totalBookings,
            usersByRole,
            usersByPlan,
            recentUsers
        ] = await Promise.all([
            // Total de usuarios
            prisma.user.count(),

            // Usuarios activos (últimos 30 días)
            prisma.user.count({
                where: {
                    updatedAt: { gte: thirtyDaysAgo }
                }
            }),

            // Total de proyectos
            prisma.project.count(),

            // Total de cuentas cloud
            prisma.cloudAccount.count(),

            // Total de reservas
            prisma.booking.count(),

            // Usuarios por rol
            prisma.user.groupBy({
                by: ["role"],
                _count: { id: true }
            }),

            // Usuarios por plan
            prisma.user.groupBy({
                by: ["planId"],
                _count: { id: true }
            }),

            // Usuarios recientes (últimos 10)
            prisma.user.findMany({
                take: 10,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true
                }
            })
        ]);

        // Formatear usuarios por rol
        const roleStats = {
            USER: 0,
            ADMIN: 0,
            SUPERADMIN: 0,
            ...Object.fromEntries(
                usersByRole.map(r => [r.role, r._count.id])
            )
        };

        // Obtener nombres de planes para estadísticas
        const planIds = usersByPlan
            .map(p => p.planId)
            .filter((id): id is string => id !== null);

        const plans = planIds.length > 0
            ? await prisma.plan.findMany({
                where: { id: { in: planIds } },
                select: { id: true, displayName: true }
            })
            : [];

        const planStats = usersByPlan.map(p => ({
            planName: p.planId
                ? plans.find(plan => plan.id === p.planId)?.displayName || "Unknown"
                : "Sin plan",
            count: p._count.id
        }));

        return NextResponse.json({
            totalUsers,
            activeUsers,
            totalProjects,
            totalCloudAccounts,
            totalBookings,
            usersByRole: roleStats,
            usersByPlan: planStats,
            recentUsers
        });

    } catch (error) {
        console.error("Error fetching stats:", error);
        return NextResponse.json(
            { error: "Error al obtener estadísticas" },
            { status: 500 }
        );
    }
}
