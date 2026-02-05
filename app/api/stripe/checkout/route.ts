
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
        const body = await req.json();
        const { amount, currency, description } = body;

        if (!amount || !description) {
            return NextResponse.json({ error: "Amount and description required" }, { status: 400 });
        }

        // 1. Get User's Connect Account
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { stripeConnectAccount: true },
        });

        const connectId = user?.stripeConnectAccount?.stripeAccountId;

        if (!connectId) {
            return NextResponse.json({ error: "No connected Stripe account found" }, { status: 400 });
        }

        // 2. Create Checkout Session ON BEHALF OF the connected account
        // Direct Charge: We create the session on the *connected account* directly using `stripeAccount` header ??
        // NO. For Generic Standard Accounts (Direct Charges), we create the session on the Platform slightly differently depending on implementation preference,
        // BUT usually for Standard accounts, we act *as* the platform but destination is directly them, or we act *on their behalf*.
        // Correct way for Standard Accounts with Direct Charges:
        // Use the `stripeAccount` header. The objects are created on THEIR account.

        // Calculate Application Fee (Optional: e.g. 5%)
        // const feePercent = 0.05;
        // const applicationFeeAmount = Math.round(amount * 100 * feePercent);

        // For now, 0% fee.
        const applicationFeeAmount = 0;

        const checkoutSession = await stripe.checkout.sessions.create(
            {
                mode: "payment",
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: currency || "usd",
                            product_data: {
                                name: description,
                            },
                            unit_amount: Math.round(amount * 100), // Convert to cents
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: {
                    application_fee_amount: applicationFeeAmount,
                },
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?success=payment_created`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?cancel=true`,
            },
            {
                stripeAccount: connectId, // <--- CRITICAL: Create on THEIR account
            }
        );

        // 3. Log Payment Intent (Pending)
        // Note: Generic Standard accounts might generate the PI later. check session structure.
        // For Direct Charges, the PaymentIntent lives on the CONNECTED account.
        // We might not get it immediately in the response if mode=payment, but we get the session ID.

        await prisma.payment.create({
            data: {
                connectAccountId: user!.stripeConnectAccount!.id,
                stripePaymentIntentId: checkoutSession.payment_intent as string || `sess_${checkoutSession.id}`, // Placeholder if PI is null initially
                stripeSessionId: checkoutSession.id,
                amount: Math.round(amount * 100),
                currency: currency || "usd",
                description,
                status: "pending",
                applicationFee: applicationFeeAmount,
            },
        });

        return NextResponse.json({ url: checkoutSession.url });

    } catch (error: any) {
        console.error("Create Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
