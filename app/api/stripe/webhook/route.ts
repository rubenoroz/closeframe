import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const getPlanByPriceId = async (priceId: string) => {
    // In a real app, map price IDs to Plan names or fetch from DB if stored
    // For now we assume priceId corresponds to "pro" plan if it matches
    // But better to store priceId in Plan model or just look up Plan by name "pro"
    // For simplicity, we'll fetch the 'pro' plan from DB directly
    return await prisma.plan.findUnique({ where: { name: "pro" } });
};

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
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // Handle events
    if (event.type === "checkout.session.completed") {
        // Subscription created via checkout
        const subscriptionId = session.subscription as string;
        const userId = session.metadata?.userId;
        // const planId = session.metadata?.planId; // Passed from checkout

        if (!userId) {
            return new NextResponse("User id missing in metadata", { status: 400 });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Find the plan based on price or metadata
        const proPlan = await prisma.plan.findUnique({ where: { name: "pro" } });

        if (proPlan) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    stripeSubscriptionId: subscriptionId,
                    stripeCustomerId: subscription.customer as string,
                    stripePriceId: subscription.items.data[0].price.id,
                    stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                    planId: proPlan.id,
                },
            });
        }
    }

    if (event.type === "invoice.payment_succeeded") {
        // Renewable subscription payment succeeded
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);

        // Update expiration date
        await prisma.user.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
                stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            }
        });
    }

    if (event.type === "customer.subscription.deleted") {
        // Subscription cancelled/expired
        const subscriptionId = session.id as string;
        const user = await prisma.user.findUnique({
            where: { stripeSubscriptionId: subscriptionId }
        });

        if (user) {
            const freePlan = await getFreePlan();
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    planId: freePlan?.id, // Revert to free
                    stripeSubscriptionId: null,
                    stripeCurrentPeriodEnd: null,
                    stripePriceId: null
                }
            });
        }
    }

    return new NextResponse(null, { status: 200 });
}
