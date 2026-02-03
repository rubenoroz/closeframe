import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const getFreePlan = async () => {
    return await prisma.plan.findUnique({ where: { name: "free" } });
};

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        console.error("[STRIPE_WEBHOOK] Signature verification failed:", error.message);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    console.log(`[STRIPE_WEBHOOK] Received event: ${event.type}`);

    try {
        // Handle checkout.session.completed
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const subscriptionId = session.subscription as string;
            const userId = session.metadata?.userId;
            const planId = session.metadata?.planId;

            if (!userId) {
                console.error("[STRIPE_WEBHOOK] User id missing in metadata");
                return new NextResponse("User id missing in metadata", { status: 400 });
            }

            if (!subscriptionId) {
                console.error("[STRIPE_WEBHOOK] Subscription id missing");
                return new NextResponse("Subscription id missing", { status: 400 });
            }

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0].price.id;

            // Calculate period end from subscription
            let periodEnd: Date | null = null;
            if ((subscription as any).current_period_end) {
                periodEnd = new Date((subscription as any).current_period_end * 1000);
            } else if ((subscription as any).ended_at) {
                periodEnd = new Date((subscription as any).ended_at * 1000);
            } else {
                // Fallback: 30 days from now
                periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }

            // Find the plan based on the Stripe Price ID or planId from metadata
            let plan = null;

            if (planId) {
                plan = await prisma.plan.findUnique({ where: { id: planId } });
            }

            if (!plan) {
                plan = await prisma.plan.findFirst({
                    where: {
                        OR: [
                            { stripePriceIdMXNMonthly: priceId },
                            { stripePriceIdMXNYearly: priceId },
                            { stripePriceIdUSDMonthly: priceId },
                            { stripePriceIdUSDYearly: priceId },
                        ]
                    }
                });
            }

            if (plan) {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        stripeSubscriptionId: subscriptionId,
                        stripeCustomerId: subscription.customer as string,
                        stripePriceId: priceId,
                        stripeCurrentPeriodEnd: periodEnd,
                        planId: plan.id,
                    },
                });
                console.log(`[STRIPE_WEBHOOK] User ${userId} subscribed to plan ${plan.name}`);
            } else {
                console.error(`[STRIPE_WEBHOOK] No plan found for priceId: ${priceId}`);
            }
        }

        // Handle invoice.payment_succeeded (for renewals)
        if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as Stripe.Invoice;
            const subscriptionId = (invoice as any).subscription as string;

            if (!subscriptionId) {
                // This might be a one-time payment, skip
                console.log("[STRIPE_WEBHOOK] invoice.payment_succeeded without subscription, skipping");
                return new NextResponse(null, { status: 200 });
            }

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            let periodEnd: Date | null = null;
            if ((subscription as any).current_period_end) {
                periodEnd = new Date((subscription as any).current_period_end * 1000);
            }

            if (periodEnd) {
                await prisma.user.updateMany({
                    where: { stripeSubscriptionId: subscriptionId },
                    data: {
                        stripeCurrentPeriodEnd: periodEnd,
                    }
                });
                console.log(`[STRIPE_WEBHOOK] Updated period end for subscription ${subscriptionId}`);
            }
        }

        // Handle customer.subscription.deleted
        if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            const subscriptionId = subscription.id;

            const user = await prisma.user.findFirst({
                where: { stripeSubscriptionId: subscriptionId }
            });

            if (user) {
                const freePlan = await getFreePlan();
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        planId: freePlan?.id,
                        stripeSubscriptionId: null,
                        stripeCurrentPeriodEnd: null,
                        stripePriceId: null
                    }
                });
                console.log(`[STRIPE_WEBHOOK] User ${user.id} subscription cancelled, reverted to free plan`);
            }
        }

    } catch (error: any) {
        console.error("[STRIPE_WEBHOOK] Error processing event:", error.message);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
}
