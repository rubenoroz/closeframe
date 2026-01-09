import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin";

// GET - Listar usuarios con paginación y filtros
export async function GET(request: NextRequest) {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const search = searchParams.get("search") || "";
        const role = searchParams.get("role") || "";
        const planId = searchParams.get("planId") || "";

        const skip = (page - 1) * limit;

        // Construir filtros
        const where: {
            OR?: { name?: { contains: string }; email?: { contains: string } }[];
            role?: string;
            planId?: string | null;
        } = {};

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } }
            ];
        }

        if (role) {
            where.role = role;
        }

        if (planId) {
            where.planId = planId === "none" ? null : planId;
        }

        // Obtener usuarios y total
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    planId: true,
                    planExpiresAt: true,
                    createdAt: true,
                    updatedAt: true,
                    plan: {
                        select: {
                            id: true,
                            displayName: true
                        }
                    },
                    _count: {
                        select: {
                            projects: true,
                            bookings: true,
                            cloudAccounts: true
                        }
                    }
                }
            }),
            prisma.user.count({ where })
        ]);

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Error al obtener usuarios" },
            { status: 500 }
        );
    }
}

// PUT - Actualizar usuario (rol, plan)
export async function PUT(request: NextRequest) {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { userId, role, planId, planExpiresAt } = body;

        if (!userId) {
            return NextResponse.json(
                { error: "userId es requerido" },
                { status: 400 }
            );
        }

        // Validar rol
        if (role && !["USER", "ADMIN", "SUPERADMIN"].includes(role)) {
            return NextResponse.json(
                { error: "Rol inválido" },
                { status: 400 }
            );
        }

        // Actualizar usuario
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(role && { role }),
                ...(planId !== undefined && { planId: planId || null }),
                ...(planExpiresAt !== undefined && {
                    planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null
                })
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                planId: true,
                planExpiresAt: true
            }
        });

        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json(
            { error: "Error al actualizar usuario" },
            { status: 500 }
        );
    }
}

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "userId es requerido" },
                { status: 400 }
            );
        }

        // Verificar que no sea el mismo superadmin
        // (esto se maneja en el frontend también)

        // Eliminar usuario (cascade eliminará relaciones)
        await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: "Error al eliminar usuario" },
            { status: 500 }
        );
    }
}
