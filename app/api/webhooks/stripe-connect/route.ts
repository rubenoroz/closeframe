
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
});

const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
// Ideally use a dedicated secret for Connect webhooks if configured separately in Dashboard, 
// using the 'connect' type webhook endpoint.

export async function POST(req: NextRequest) {
    const payload = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) throw new Error("Missing signature or secret");
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Handle Connect Events
    // Verify if this event belongs to a connected account
    // if (event.account) { ... }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                // Find payment by session ID
                await prisma.payment.updateMany({
                    where: { stripeSessionId: session.id },
                    data: {
                        status: "succeeded",
                        stripePaymentIntentId: session.payment_intent as string,
                        updatedAt: new Date(),
                    }
                });
                break;
            }
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                // If we created a payment record with PI ID already
                await prisma.payment.update({
                    where: { stripePaymentIntentId: paymentIntent.id },
                    data: { status: "succeeded" },
                }).catch(() => {
                    // Ignore if not found (might be external charge not from our platform flow)
                });
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error("Webhook Logic Error:", error);
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
