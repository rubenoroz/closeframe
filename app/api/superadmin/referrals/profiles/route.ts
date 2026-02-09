import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ReferralProfileType } from "@prisma/client";
import {
    DEFAULT_AFFILIATE_CONFIG,
    DEFAULT_CUSTOMER_CONFIG
} from "@/types/referral";

// GET /api/superadmin/referrals/profiles - List all profiles
export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ReferralProfileType | null;

    const profiles = await prisma.referralProfile.findMany({
        where: type ? { type } : undefined,
        include: {
            _count: {
                select: { assignments: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(profiles);
}

// POST /api/superadmin/referrals/profiles - Create new profile
export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, type, isDefault, config } = body;

        if (!name || !type) {
            return NextResponse.json(
                { error: "Name and type are required" },
                { status: 400 }
            );
        }

        // Use default config if not provided
        const profileConfig = config || (
            type === "AFFILIATE" ? DEFAULT_AFFILIATE_CONFIG : DEFAULT_CUSTOMER_CONFIG
        );

        // If setting as default, unset other defaults of same type
        if (isDefault) {
            await prisma.referralProfile.updateMany({
                where: { type, isDefault: true },
                data: { isDefault: false }
            });
        }

        const profile = await prisma.referralProfile.create({
            data: {
                name,
                type,
                isDefault: isDefault ?? false,
                isActive: true,
                config: profileConfig
            }
        });

        return NextResponse.json(profile, { status: 201 });
    } catch (error) {
        console.error("Error creating referral profile:", error);
        return NextResponse.json(
            { error: "Failed to create profile" },
            { status: 500 }
        );
    }
}
