
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Helper to check admin role
async function checkAdmin() {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function GET() {
    try {
        await checkAdmin();

        const [plans, features] = await Promise.all([
            prisma.plan.findMany({
                include: {
                    planFeatures: true
                },
                orderBy: {
                    priceUSD: 'asc' // or sortOrder
                }
            }),
            prisma.feature.findMany({
                orderBy: {
                    category: 'asc'
                }
            })
        ]);

        return NextResponse.json({ plans, features });
    } catch (error) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
}

export async function PUT(req: Request) {
    try {
        await checkAdmin();
        const body = await req.json();
        const { planId, featureId, enabled, limit } = body;

        if (!planId || !featureId) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        const updated = await prisma.planFeature.upsert({
            where: {
                planId_featureId: {
                    planId,
                    featureId
                }
            },
            update: {
                enabled,
                limit
            },
            create: {
                planId,
                featureId,
                enabled,
                limit
            }
        });

        // [NEW] Sync Plan.config (JSON) to match PlanFeature
        // This ensures that the JSON config (used by new system) stays in sync with the DB table
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (plan) {
            const config = (plan.config as any) || {};
            const features = config.features || {};
            const limits = config.limits || {};

            // Update JSON config
            // If feature has keys related to features (boolean) update features object
            // If feature has keys related to limits (number) update limits object
            // For now simplest approach: if it has a limit, update limit. If not, update boolean.

            // Get feature key from DB to be sure
            const featureDef = await prisma.feature.findUnique({ where: { id: featureId } });

            if (featureDef) {
                if (limit !== undefined && limit !== null) {
                    limits[featureDef.key] = limit;
                    // Ensure enabled is also set if limit > 0? Or just trust enabled flag?
                    // The UI sends enabled + limit together.
                }

                // Always sync enabled status if provided
                if (enabled !== undefined) {
                    features[featureDef.key] = enabled;
                }

                // If this is a limit-type feature, ensure it's in limits too
                // We infer it from the category or if a limit value was explicitly provided
                if (limit !== undefined && limit !== null) {
                    limits[featureDef.key] = limit;
                }

                await prisma.plan.update({
                    where: { id: planId },
                    data: {
                        config: {
                            ...config,
                            features,
                            limits
                        }
                    }
                });
            }
        }

        const { revalidatePath } = await import("next/cache");
        revalidatePath('/superadmin/features');
        revalidatePath('/api/features/me'); // Clear client cache
        revalidatePath('/'); // Clear general cache

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Failed to update feature", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
