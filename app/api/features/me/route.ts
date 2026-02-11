
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // 1. Fetch User with Plan and Overrides
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                planId: true,
                role: true,
                featureOverrides: true
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Use centralized service logic (Handles Superadmin, Plans and Overrides correctly)
        const { getEffectiveFeatures } = await import("@/lib/features/service");
        const featuresMap = await getEffectiveFeatures(userId);

        // Fetch user basic info for response context
        const userData = await prisma.user.findUnique({
            where: { id: userId },
            select: { planId: true, role: true }
        });

        return NextResponse.json({
            features: featuresMap,
            planId: userData?.planId,
            role: userData?.role
        });

    } catch (error) {
        console.error("Failed to fetch features", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
