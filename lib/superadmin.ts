import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Verifica si el usuario actual tiene rol SUPERADMIN
 */
export async function isSuperAdmin(): Promise<boolean> {
    const session = await auth();
    if (!session?.user?.id) return false;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    });

    return user?.role === "SUPERADMIN";
}

/**
 * Obtiene la sesión verificando que sea SUPERADMIN
 * Retorna null si no es superadmin
 */
export async function getSuperAdminSession() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, email: true, name: true }
    });

    if (user?.role !== "SUPERADMIN") return null;

    return { session, user };
}

/**
 * Middleware para proteger APIs de superadmin
 * Retorna NextResponse.json con error si no está autorizado
 */
export async function requireSuperAdmin(): Promise<NextResponse | null> {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "No autenticado" },
            { status: 401 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    });

    if (user?.role !== "SUPERADMIN") {
        return NextResponse.json(
            { error: "Acceso denegado. Se requiere rol SUPERADMIN" },
            { status: 403 }
        );
    }

    return null; // Autorizado
}

/**
 * Helper para parsear JSON de features/limits de Plan
 */
export function parsePlanFeatures(featuresJson: string): string[] {
    try {
        return JSON.parse(featuresJson);
    } catch {
        return [];
    }
}

export function parsePlanLimits(limitsJson: string): Record<string, unknown> {
    try {
        return JSON.parse(limitsJson);
    } catch {
        return {};
    }
}
