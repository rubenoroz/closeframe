import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
    applyReferredBenefit,
    getCheckoutBenefits
} from "@/lib/services/customer-benefits.service";
import { cookies } from "next/headers";
import { REFERRAL_COOKIE_NAME } from "@/types/referral";

// POST /api/referrals/apply-benefit - Apply referral benefit at checkout
export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { referralCode: explicitCode } = body;

        // Get code from cookie if not provided
        const cookieStore = await cookies();
        const cookieCode = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;
        const referralCode = explicitCode || cookieCode;

        if (!referralCode) {
            return NextResponse.json(
                { error: "No referral code provided" },
                { status: 400 }
            );
        }

        // Get user with Stripe info
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user?.stripeCustomerId) {
            return NextResponse.json(
                { error: "User has no Stripe customer ID. Complete checkout first." },
                { status: 400 }
            );
        }

        if (!user.email) {
            return NextResponse.json(
                { error: "User has no email" },
                { status: 400 }
            );
        }

        // Apply the benefit
        const result = await applyReferredBenefit(
            referralCode,
            user.stripeCustomerId,
            user.email
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            benefit: {
                discountPercent: result.discountPercent,
                discountAmount: result.discountAmount,
                freeMonths: result.freeMonths
            }
        });
    } catch (error) {
        console.error("[REFERRAL] Error applying benefit:", error);
        return NextResponse.json(
            { error: "Failed to apply benefit" },
            { status: 500 }
        );
    }
}

// GET /api/referrals/apply-benefit - Get available benefit for checkout preview
export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.email) {
        return NextResponse.json({ hasReferral: false });
    }

    // Get referral code from query or cookie
    const searchParams = request.nextUrl.searchParams;
    const explicitCode = searchParams.get("code");

    const cookieStore = await cookies();
    const cookieCode = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;
    const referralCode = explicitCode || cookieCode;

    if (!referralCode) {
        return NextResponse.json({ hasReferral: false });
    }

    const benefits = await getCheckoutBenefits(referralCode, session.user.email);

    return NextResponse.json(benefits);
}
