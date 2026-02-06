
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

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Failed to update feature", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
