import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

// GET: List all plans with their modular config
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Verify Superadmin
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { role: true }
        });

        if (currentUser?.role !== "SUPERUSER" && currentUser?.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const plans = await prisma.plan.findMany({
            orderBy: { sortOrder: 'asc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        // Parse legacy JSON strings if needed, or rely on config
        const parsedPlans = plans.map(p => ({
            ...p,
            features: p.features ? JSON.parse(p.features) : [],
            limits: p.limits ? JSON.parse(p.limits) : {},
        }));

        return NextResponse.json({ plans: parsedPlans });
    } catch (error) {
        console.error("GET Plans Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PUT: Bulk update or Single Update plans
export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Verify Superadmin
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { role: true }
        });

        if (currentUser?.role !== "SUPERUSER" && currentUser?.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();

        // Handle Sort Order Bulk Update
        if (!body.planId && body.id && typeof body.sortOrder === 'number') {
            const updated = await prisma.plan.update({
                where: { id: body.id },
                data: { sortOrder: body.sortOrder }
            });
            return NextResponse.json({ plan: updated });
        }

        const { planId, id, config, name, displayName, description, price, currency, interval, isActive, features, limits } = body;
        const targetId = planId || id;

        if (!targetId) {
            return NextResponse.json({ error: "Missing planId" }, { status: 400 });
        }

        const updateData: any = {};
        if (config !== undefined) updateData.config = config;
        if (name !== undefined) updateData.name = name;
        if (displayName !== undefined) updateData.displayName = displayName;
        if (description !== undefined) updateData.description = description;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (body.monthlyPrice !== undefined) updateData.monthlyPrice = body.monthlyPrice;
        if (currency !== undefined) updateData.currency = currency;
        if (currency !== undefined) updateData.currency = currency;
        if (interval !== undefined) updateData.interval = interval;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Handle legacy fields for backward compatibility if PlansPage sends them
        if (features !== undefined) updateData.features = JSON.stringify(features);
        if (limits !== undefined) updateData.limits = JSON.stringify(limits);

        const updatedPlan = await prisma.plan.update({
            where: { id: targetId },
            data: updateData
        });

        return NextResponse.json({ plan: updatedPlan });

    } catch (error) {
        console.error("PUT Plans Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { role: true }
        });

        if (currentUser?.role !== "SUPERUSER" && currentUser?.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, displayName, description, price, monthlyPrice, currency, interval, features, limits, isActive, config } = body;

        const newPlan = await prisma.plan.create({
            data: {
                name,
                displayName,
                description,
                price,
                monthlyPrice,
                currency,
                interval,
                isActive: isActive ?? true,
                features: JSON.stringify(features || []),
                limits: JSON.stringify(limits || {}),
                config: config || {},
            }
        });

        return NextResponse.json({ plan: newPlan });

    } catch (error) {
        console.error("POST Plans Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { role: true }
        });

        if (currentUser?.role !== "SUPERUSER" && currentUser?.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        await prisma.plan.delete({ where: { id } });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE Plans Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
