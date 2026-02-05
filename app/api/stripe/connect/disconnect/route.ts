
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { stripeConnectAccount: true },
        });

        if (!user?.stripeConnectAccount?.stripeAccountId) {
            return NextResponse.json({ error: "No account to disconnect" }, { status: 400 });
        }

        const accountId = user.stripeConnectAccount.stripeAccountId;

        // Optional: Deauthorize in Stripe (Revoke OAuth access)
        try {
            await stripe.oauth.deauthorize({
                client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
                stripe_user_id: accountId,
            });
        } catch (e) {
            console.error("Stripe deauth error (ignoring):", e);
        }

        // Remove from Database
        await prisma.stripeConnectAccount.delete({
            where: { userId: session.user.id },
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Disconnect Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
