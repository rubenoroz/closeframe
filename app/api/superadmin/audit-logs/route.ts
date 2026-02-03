import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin";

// GET - Listar logs de auditoría de overrides
export async function GET(request: NextRequest) {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        const skip = (page - 1) * limit;

        const where = userId ? { userId } : {};

        const [logs, total] = await Promise.all([
            prisma.featureOverrideLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.featureOverrideLog.count({ where })
        ]);

        // Enrich with user info
        const userIds: string[] = [...new Set(logs.map((l: { userId: string }) => l.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true }
        });
        const userMap = new Map(users.map((u: { id: string; name: string | null; email: string }) => [u.id, u]));

        const enrichedLogs = logs.map((log: { userId: string }) => ({
            ...log,
            user: userMap.get(log.userId) || { name: "Deleted", email: "N/A" }
        }));

        return NextResponse.json({
            logs: enrichedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
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
