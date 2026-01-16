import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - Obtener planes activos para mostrar en la landing/pricing
// Esta ruta es PÚBLICA (no requiere autenticación)
export async function GET() {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                price: true,
                currency: true,
                interval: true,
                features: true,
                sortOrder: true
            }
        });

        // Parsear features de JSON
        const formattedPlans = plans.map(plan => ({
            ...plan,
            features: JSON.parse(plan.features || "[]")
        }));

        return NextResponse.json(formattedPlans);

    } catch (error) {
        console.error("Error fetching public plans:", error);
        return NextResponse.json(
            { error: "Error al obtener planes" },
            { status: 500 }
        );
    }
}
