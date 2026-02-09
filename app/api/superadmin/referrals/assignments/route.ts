import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateReferralCode } from "@/types/referral";

// GET /api/superadmin/referrals/assignments - List all assignments
export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const profileId = searchParams.get("profileId");
    const userId = searchParams.get("userId");

    const assignments = await prisma.referralAssignment.findMany({
        where: {
            ...(status && { status: status as any }),
            ...(profileId && { profileId }),
            ...(userId && { userId })
        },
        include: {
            user: {
                select: { id: true, name: true, email: true, image: true }
            },
            profile: {
                select: { id: true, name: true, type: true }
            },
            _count: {
                select: { referrals: true, commissions: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(assignments);
}

// POST /api/superadmin/referrals/assignments - Assign profile to user
export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { userId, profileId, customSlug, expiresAt, configOverride } = body;

        if (!userId || !profileId) {
            return NextResponse.json(
                { error: "userId and profileId are required" },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if profile exists
        const profile = await prisma.referralProfile.findUnique({
            where: { id: profileId }
        });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Check if user already has an assignment for this profile type
        const existingAssignment = await prisma.referralAssignment.findFirst({
            where: {
                userId,
                profile: { type: profile.type }
            }
        });

        if (existingAssignment) {
            return NextResponse.json(
                { error: `User already has a ${profile.type} referral assignment` },
                { status: 400 }
            );
        }

        // Generate unique referral code
        let referralCode: string;
        let attempts = 0;
        do {
            referralCode = generateReferralCode();
            const existing = await prisma.referralAssignment.findUnique({
                where: { referralCode }
            });
            if (!existing) break;
            attempts++;
        } while (attempts < 10);

        if (attempts >= 10) {
            return NextResponse.json(
                { error: "Failed to generate unique referral code" },
                { status: 500 }
            );
        }

        // Validate custom slug if provided
        if (customSlug) {
            const slugExists = await prisma.referralAssignment.findUnique({
                where: { customSlug }
            });
            if (slugExists) {
                return NextResponse.json(
                    { error: "Custom slug already in use" },
                    { status: 400 }
                );
            }
        }

        const assignment = await prisma.referralAssignment.create({
            data: {
                userId,
                profileId,
                referralCode,
                customSlug: customSlug || null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                configOverride: configOverride || null
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                profile: {
                    select: { id: true, name: true, type: true }
                }
            }
        });

        // Log audit
        await prisma.referralAuditLog.create({
            data: {
                assignmentId: assignment.id,
                action: "ASSIGNMENT_CREATED",
                actorId: session.user.id!,
                actorType: "ADMIN",
                newValue: {
                    profileId,
                    referralCode,
                    customSlug
                }
            }
        });

        return NextResponse.json(assignment, { status: 201 });
    } catch (error) {
        console.error("Error creating referral assignment:", error);
        return NextResponse.json(
            { error: "Failed to create assignment" },
            { status: 500 }
        );
    }
}
