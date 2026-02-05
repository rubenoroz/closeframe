
"use server";

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
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { stripeConnectAccount: true },
        });

        const accountId = user?.stripeConnectAccount?.stripeAccountId;

        if (!accountId) {
            return NextResponse.json({ error: "No connected account found locally." }, { status: 404 });
        }

        // Attempt to update the account directly
        // Note: This works for Standard accounts in Test Mode usually, 
        // but normally Standard accounts must update themselves provided they have completed onboarding.
        // We try to force the business profile if it's missing.
        const updated = await stripe.accounts.update(accountId, {
            business_profile: {
                name: "Closerlens Photographer (Test)",
                url: "https://closerlens.com/photographer",
            },
            // setting business_type might be required if not set
            business_type: "individual",
        });

        return NextResponse.json({
            success: true,
            message: "Account updated successfully. Try creating a payment link now.",
            account: {
                id: updated.id,
                business_profile: updated.business_profile,
                details_submitted: updated.details_submitted
            }
        });

    } catch (error: any) {
        console.error("Fix Account Error:", error);
        return NextResponse.json({
            error: error.message,
            hint: "If this failed, you may need to complete the Stripe onboarding manually via the Dashboard link."
        }, { status: 500 });
    }
}
