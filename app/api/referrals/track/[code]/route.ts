import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE } from "@/types/referral";

interface RouteParams {
    params: Promise<{ code: string }>;
}

// GET /api/referrals/track/[code] - Track click and redirect
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { code } = await params;

    // Find assignment by code or custom slug
    const assignment = await prisma.referralAssignment.findFirst({
        where: {
            OR: [
                { referralCode: code },
                { customSlug: code }
            ],
            status: "ACTIVE"
        },
        include: {
            profile: true
        }
    });

    // Default redirect URL
    const defaultRedirect = "/pricing";

    if (!assignment) {
        // Invalid code, redirect without setting cookie
        return NextResponse.redirect(new URL(defaultRedirect, request.url));
    }

    // Check if assignment is expired
    if (assignment.expiresAt && assignment.expiresAt < new Date()) {
        return NextResponse.redirect(new URL(defaultRedirect, request.url));
    }

    // Get tracking info
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;
    const referer = request.headers.get("referer") || undefined;
    const { searchParams } = new URL(request.url);

    // Record click
    await prisma.referralClick.create({
        data: {
            referralCode: assignment.referralCode,
            ip,
            userAgent,
            referer,
            landingPage: searchParams.get("redirect") || defaultRedirect,
            fingerprint: searchParams.get("fp") || undefined
        }
    });

    // Update click count
    await prisma.referralAssignment.update({
        where: { id: assignment.id },
        data: { totalClicks: { increment: 1 } }
    });

    // Build redirect URL
    const redirectTo = searchParams.get("redirect") || defaultRedirect;
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    // Set referral cookie
    response.cookies.set(REFERRAL_COOKIE_NAME, assignment.referralCode, {
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    return response;
}
