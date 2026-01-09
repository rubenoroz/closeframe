import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin";

// GET - Listar todos los planes
export async function GET() {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const plans = await prisma.plan.findMany({
            orderBy: { sortOrder: "asc" },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        // Parsear features y limits de JSON
        const formattedPlans = plans.map(plan => ({
            ...plan,
            features: JSON.parse(plan.features || "[]"),
            limits: JSON.parse(plan.limits || "{}")
        }));

        return NextResponse.json(formattedPlans);

    } catch (error) {
        console.error("Error fetching plans:", error);
        return NextResponse.json(
            { error: "Error al obtener planes" },
            { status: 500 }
        );
    }
}

// POST - Crear nuevo plan
export async function POST(request: NextRequest) {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const {
            name,
            displayName,
            description,
            price,
            currency,
            interval,
            features,
            limits,
            isActive,
            sortOrder
        } = body;

        // Validaciones básicas
        if (!name || !displayName) {
            return NextResponse.json(
                { error: "name y displayName son requeridos" },
                { status: 400 }
            );
        }

        // Verificar que no exista un plan con ese nombre
        const existingPlan = await prisma.plan.findUnique({
            where: { name }
        });

        if (existingPlan) {
            return NextResponse.json(
                { error: "Ya existe un plan con ese nombre" },
                { status: 400 }
            );
        }

        const plan = await prisma.plan.create({
            data: {
                name,
                displayName,
                description: description || null,
                price: price || 0,
                currency: currency || "USD",
                interval: interval || "month",
                features: JSON.stringify(features || []),
                limits: JSON.stringify(limits || {}),
                isActive: isActive ?? true,
                sortOrder: sortOrder || 0
            }
        });

        return NextResponse.json({
            ...plan,
            features: JSON.parse(plan.features),
            limits: JSON.parse(plan.limits)
        });

    } catch (error) {
        console.error("Error creating plan:", error);
        return NextResponse.json(
            { error: "Error al crear plan" },
            { status: 500 }
        );
    }
}

// PUT - Actualizar plan
export async function PUT(request: NextRequest) {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const {
            id,
            name,
            displayName,
            description,
            price,
            currency,
            interval,
            features,
            limits,
            isActive,
            sortOrder
        } = body;

        if (!id) {
            return NextResponse.json(
                { error: "id es requerido" },
                { status: 400 }
            );
        }

        // Si se cambia el nombre, verificar que no exista
        if (name) {
            const existingPlan = await prisma.plan.findFirst({
                where: {
                    name,
                    NOT: { id }
                }
            });

            if (existingPlan) {
                return NextResponse.json(
                    { error: "Ya existe un plan con ese nombre" },
                    { status: 400 }
                );
            }
        }

        const plan = await prisma.plan.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(displayName && { displayName }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price }),
                ...(currency && { currency }),
                ...(interval && { interval }),
                ...(features && { features: JSON.stringify(features) }),
                ...(limits && { limits: JSON.stringify(limits) }),
                ...(isActive !== undefined && { isActive }),
                ...(sortOrder !== undefined && { sortOrder })
            }
        });

        return NextResponse.json({
            ...plan,
            features: JSON.parse(plan.features),
            limits: JSON.parse(plan.limits)
        });

    } catch (error) {
        console.error("Error updating plan:", error);
        return NextResponse.json(
            { error: "Error al actualizar plan" },
            { status: 500 }
        );
    }
}

// DELETE - Eliminar plan
export async function DELETE(request: NextRequest) {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const planId = searchParams.get("id");

        if (!planId) {
            return NextResponse.json(
                { error: "id es requerido" },
                { status: 400 }
            );
        }

        // Verificar si hay usuarios con este plan
        const usersWithPlan = await prisma.user.count({
            where: { planId }
        });

        if (usersWithPlan > 0) {
            return NextResponse.json(
                { error: `No se puede eliminar: ${usersWithPlan} usuario(s) tienen este plan` },
                { status: 400 }
            );
        }

        await prisma.plan.delete({
            where: { id: planId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting plan:", error);
        return NextResponse.json(
            { error: "Error al eliminar plan" },
            { status: 500 }
        );
    }
}
