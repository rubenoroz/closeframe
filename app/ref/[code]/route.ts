import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE } from "@/types/referral";

interface RouteParams {
    params: Promise<{ code: string }>;
}

/**
 * Public referral redirect route
 * GET /ref/[code]
 * 
 * Tracks the click and redirects to the landing page with the referral cookie set.
 */
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
        }
    });

    // Default redirect URL (Landing page/Pricing)
    const defaultRedirect = "/pricing";

    if (!assignment) {
        console.log(`[REFERRAL] Invalid referral code attempt: ${code}`);
        return NextResponse.redirect(new URL(defaultRedirect, request.url));
    }

    // Check if assignment is expired
    if (assignment.expiresAt && assignment.expiresAt < new Date()) {
        console.log(`[REFERRAL] Expired referral code attempt: ${code}`);
        return NextResponse.redirect(new URL(defaultRedirect, request.url));
    }

    // Get tracking info
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;
    const referer = request.headers.get("referer") || undefined;

    // Process search params for potential override redirects
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get("redirect") || defaultRedirect;

    try {
        // Record click asynchronously (don't block the redirect)
        // Note: Using a promise to avoid blocking the response
        prisma.referralClick.create({
            data: {
                referralCode: assignment.referralCode,
                ip,
                userAgent,
                referer,
                landingPage: redirectTo,
                fingerprint: searchParams.get("fp") || undefined
            }
        }).catch(err => console.error("[REFERRAL] Error recording click:", err));

        // Update click count
        prisma.referralAssignment.update({
            where: { id: assignment.id },
            data: { totalClicks: { increment: 1 } }
        }).catch(err => console.error("[REFERRAL] Error updating click count:", err));

    } catch (err) {
        console.error("[REFERRAL] Unexpected error in tracking:", err);
    }

    // Build response with redirect
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    // Set referral cookie
    response.cookies.set(REFERRAL_COOKIE_NAME, assignment.referralCode, {
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    console.log(`[REFERRAL] Tracking successful for ${assignment.referralCode}. Redirecting to ${redirectTo}`);

    return response;
}
