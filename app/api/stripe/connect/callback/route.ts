
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
});

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
        return NextResponse.redirect(
            new URL(`/dashboard/payments?error=${error}&message=${errorDescription}`, req.url)
        );
    }

    if (!code) {
        return NextResponse.redirect(new URL("/dashboard/payments?error=missing_code", req.url));
    }

    try {
        // Exchange authorization code for connected account ID
        const response = await stripe.oauth.token({
            grant_type: "authorization_code",
            code: code,
        });

        const connectedAccountId = response.stripe_user_id; // "acct_..."

        if (!connectedAccountId) {
            throw new Error("No connected account ID returned");
        }

        // Save to Database
        await prisma.stripeConnectAccount.upsert({
            where: { userId: session.user.id },
            update: {
                stripeAccountId: connectedAccountId,
                chargesEnabled: true, // Typically true after OAuth, but webhooks confirm
                payoutsEnabled: true,
                updatedAt: new Date(),
            },
            create: {
                userId: session.user.id,
                stripeAccountId: connectedAccountId,
                chargesEnabled: true,
                payoutsEnabled: true,
            },
        });

        return NextResponse.redirect(new URL("/dashboard/payments?success=connected", req.url));

    } catch (err: any) {
        console.error("Stripe OAuth Error:", err);
        return NextResponse.redirect(
            new URL(`/dashboard/payments?error=oauth_failed&message=${encodeURIComponent(err.message)}`, req.url)
        );
    }
}
