import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

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

        // Handle Sort Order Bulk Update (only if distinct fields are missing)
        const isSortOnly = !body.planId && body.id && typeof body.sortOrder === 'number' && !body.name && !body.price;

        if (isSortOnly) {
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
        if (price !== undefined) updateData.price = price;
        if (body.monthlyPrice !== undefined) updateData.monthlyPrice = body.monthlyPrice;
        if (currency !== undefined) updateData.currency = currency;
        if (interval !== undefined) updateData.interval = interval;
        if (isActive !== undefined) updateData.isActive = isActive;

        // Regional Pricing Fields
        if (body.priceMXN !== undefined) updateData.priceMXN = body.priceMXN;
        if (body.monthlyPriceMXN !== undefined) updateData.monthlyPriceMXN = body.monthlyPriceMXN;
        if (body.priceUSD !== undefined) updateData.priceUSD = body.priceUSD;
        if (body.monthlyPriceUSD !== undefined) updateData.monthlyPriceUSD = body.monthlyPriceUSD;

        // Stripe Price IDs
        if (body.stripePriceIdMXNMonthly !== undefined) updateData.stripePriceIdMXNMonthly = body.stripePriceIdMXNMonthly;
        if (body.stripePriceIdMXNYearly !== undefined) updateData.stripePriceIdMXNYearly = body.stripePriceIdMXNYearly;
        if (body.stripePriceIdUSDMonthly !== undefined) updateData.stripePriceIdUSDMonthly = body.stripePriceIdUSDMonthly;
        if (body.stripePriceIdUSDYearly !== undefined) updateData.stripePriceIdUSDYearly = body.stripePriceIdUSDYearly;

        // Handle legacy fields for backward compatibility if PlansPage sends them
        if (features !== undefined) updateData.features = JSON.stringify(features);
        if (limits !== undefined) updateData.limits = JSON.stringify(limits);

        console.log("Update Data Prepared:", updateData);

        const updatedPlan = await prisma.plan.update({
            where: { id: targetId },
            data: updateData
        });

        // [NEW] Sync PlanFeature table to match Config
        // This ensures compatibility with legacy checks and the PlanFeature table priority
        if (config && (config.features || config.limits)) {
            const allFeatures = await prisma.feature.findMany();
            const featureMap = new Map(allFeatures.map(f => [f.key, f.id]));

            const upsertOperations = [];

            // 1. Sync Booleans (Features)
            if (config.features) {
                for (const [key, value] of Object.entries(config.features)) {
                    const featureId = featureMap.get(key);
                    if (featureId) {
                        upsertOperations.push(
                            prisma.planFeature.upsert({
                                where: { planId_featureId: { planId: targetId, featureId } },
                                update: { enabled: value === true }, // Keep limit if exists? safely just update enabled
                                create: { planId: targetId, featureId, enabled: value === true }
                            })
                        );
                    }
                }
            }

            // 2. Sync Limits (Numbers)
            if (config.limits) {
                for (const [key, value] of Object.entries(config.limits)) {
                    const featureId = featureMap.get(key);
                    if (featureId) {
                        const limitVal = typeof value === 'number' ? value : null;
                        upsertOperations.push(
                            prisma.planFeature.upsert({
                                where: { planId_featureId: { planId: targetId, featureId } },
                                update: { enabled: true, limit: limitVal },
                                create: { planId: targetId, featureId, enabled: true, limit: limitVal }
                            })
                        );
                    }
                }
            }

            if (upsertOperations.length > 0) {
                await prisma.$transaction(upsertOperations);
                console.log(`Synced ${upsertOperations.length} PlanFeature records for plan ${updatedPlan.name}`);
            }
        }

        // Purge cache
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/superadmin/plans"); // Admin page
        revalidatePath("/"); // Landing page
        revalidatePath("/plan-b"); // Just in case

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
                price: price || 0,
                monthlyPrice,
                currency: currency || 'USD',
                interval: interval || 'month',
                // Regional Pricing
                priceMXN: body.priceMXN || 0,
                monthlyPriceMXN: body.monthlyPriceMXN,
                priceUSD: body.priceUSD || 0,
                monthlyPriceUSD: body.monthlyPriceUSD,
                // Stripe Price IDs
                stripePriceIdMXNMonthly: body.stripePriceIdMXNMonthly,
                stripePriceIdMXNYearly: body.stripePriceIdMXNYearly,
                stripePriceIdUSDMonthly: body.stripePriceIdUSDMonthly,
                stripePriceIdUSDYearly: body.stripePriceIdUSDYearly,
                // Legacy
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
