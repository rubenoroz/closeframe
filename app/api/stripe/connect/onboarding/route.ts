
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

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { stripeConnectAccount: true },
        });

        const accountId = user?.stripeConnectAccount?.stripeAccountId;

        if (!accountId) {
            return NextResponse.redirect(new URL("/dashboard/payments?error=no_account", req.url));
        }

        // Create an Account Link to resume onboarding
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?error=refresh`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?success=connected`,
            type: "account_onboarding",
        });

        return NextResponse.redirect(accountLink.url);

    } catch (error: any) {
        console.error("Onboarding Link Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
