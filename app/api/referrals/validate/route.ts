import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { REFERRAL_COOKIE_NAME } from "@/types/referral";
import { CustomerProfileConfig } from "@/types/referral";

// POST /api/referrals/validate - Validate referral code and get benefits
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, email } = body;

        // Get code from body or cookie
        const referralCode = code || request.cookies.get(REFERRAL_COOKIE_NAME)?.value;

        if (!referralCode) {
            return NextResponse.json({ valid: false, reason: "NO_CODE" });
        }

        // Find assignment
        const assignment = await prisma.referralAssignment.findFirst({
            where: {
                OR: [
                    { referralCode },
                    { customSlug: referralCode }
                ],
                status: "ACTIVE"
            },
            include: {
                profile: true,
                user: {
                    select: { id: true, email: true }
                }
            }
        });

        if (!assignment) {
            return NextResponse.json({ valid: false, reason: "INVALID_CODE" });
        }

        // Check expiration
        if (assignment.expiresAt && assignment.expiresAt < new Date()) {
            return NextResponse.json({ valid: false, reason: "EXPIRED" });
        }

        // Check if email is the referrer's own email (no self-referral)
        if (email && assignment.user.email === email) {
            return NextResponse.json({ valid: false, reason: "SELF_REFERRAL" });
        }

        // Check if email was already referred
        if (email) {
            const existingReferral = await prisma.referral.findFirst({
                where: { referredEmail: email }
            });
            if (existingReferral) {
                return NextResponse.json({ valid: false, reason: "ALREADY_REFERRED" });
            }

            // Check if email is already a user
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            if (existingUser) {
                return NextResponse.json({ valid: false, reason: "EXISTING_USER" });
            }
        }

        // Get configuration
        const config = assignment.configOverride || assignment.profile.config;
        const profileType = assignment.profile.type;

        // Build response based on profile type
        if (profileType === "CUSTOMER") {
            const customerConfig = config as CustomerProfileConfig;
            return NextResponse.json({
                valid: true,
                referralCode: assignment.referralCode,
                referrerName: assignment.user.id, // Don't expose name for privacy
                benefit: customerConfig.referredBenefit,
                profileType
            });
        } else {
            // AFFILIATE - referred user may not get direct benefit
            // but we still track the referral
            return NextResponse.json({
                valid: true,
                referralCode: assignment.referralCode,
                profileType
            });
        }
    } catch (error) {
        console.error("Error validating referral:", error);
        return NextResponse.json(
            { valid: false, reason: "ERROR" },
            { status: 500 }
        );
    }
}
