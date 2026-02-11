import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrAbove } from "@/lib/superadmin";

// GET - Listar logs de auditoría (overrides + acciones globales)
export async function GET(request: NextRequest) {
    const { error: authError } = await requireAdminOrAbove();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const type = searchParams.get("type") || "all"; // "overrides" | "actions" | "all"
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        const skip = (page - 1) * limit;

        // Feature Override Logs
        let overrideLogs: any[] = [];
        let overrideTotal = 0;
        if (type === "overrides" || type === "all") {
            const where = userId ? { userId } : {};
            const [logs, total] = await Promise.all([
                prisma.featureOverrideLog.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip: type === "overrides" ? skip : 0,
                    take: type === "overrides" ? limit : 25,
                }),
                prisma.featureOverrideLog.count({ where })
            ]);

            // Enrich with user info
            const userIds: string[] = [...new Set(logs.map((l: any) => l.userId))];
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, email: true }
            });
            const userMap = new Map(users.map((u: any) => [u.id, u]));

            overrideLogs = logs.map((log: any) => ({
                ...log,
                _type: "override",
                user: userMap.get(log.userId) || { name: "Eliminado", email: "N/A" }
            }));
            overrideTotal = total;
        }

        // Admin Action Logs (Global Audit)
        let actionLogs: any[] = [];
        let actionTotal = 0;
        if (type === "actions" || type === "all") {
            const where = userId ? { adminId: userId } : {};
            const [logs, total] = await Promise.all([
                prisma.adminActionLog.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip: type === "actions" ? skip : 0,
                    take: type === "actions" ? limit : 25,
                }),
                prisma.adminActionLog.count({ where })
            ]);

            actionLogs = logs.map((log: any) => ({
                ...log,
                _type: "action",
            }));
            actionTotal = total;
        }

        // Merge and sort by date if "all"
        let allLogs = [...overrideLogs, ...actionLogs];
        if (type === "all") {
            allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            allLogs = allLogs.slice(0, limit);
        }

        return NextResponse.json({
            logs: allLogs,
            pagination: {
                page,
                limit,
                total: type === "overrides" ? overrideTotal : type === "actions" ? actionTotal : overrideTotal + actionTotal,
                totalPages: Math.ceil(
                    (type === "overrides" ? overrideTotal : type === "actions" ? actionTotal : overrideTotal + actionTotal) / limit
                )
            }
        });

    } catch (error) {
        console.error("Error fetching audit logs:", error);
        return NextResponse.json(
            { error: "Error al obtener logs de auditoría" },
            { status: 500 }
        );
    }
}
