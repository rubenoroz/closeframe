
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

        const account = await stripe.accounts.retrieve(accountId);

        return NextResponse.json({
            id: account.id,
            type: account.type,
            charges_enabled: account.charges_enabled,
            details_submitted: account.details_submitted,
            business_profile: account.business_profile,
            capabilities: account.capabilities,
            requirements: account.requirements,
        }, { status: 200 });

    } catch (error: any) {
        console.error("Debug Account Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
