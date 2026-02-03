import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { planId, priceId } = await req.json();

        if (!planId || !priceId) {
            return new NextResponse("Missing planId or priceId", { status: 400 });
        }

        // Get user details with current plan
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                plan: {
                    select: { id: true, sortOrder: true }
                }
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Get target plan to compare
        const targetPlan = await prisma.plan.findUnique({
            where: { id: planId },
            select: { id: true, sortOrder: true }
        });

        if (!targetPlan) {
            return new NextResponse("Target plan not found", { status: 404 });
        }

        // Identify or create Stripe Customer
        let customerId = user.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name || undefined,
                metadata: {
                    userId: user.id,
                },
            });
            customerId = customer.id;

            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId },
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // CASE 1: User has NO active subscription → Create new checkout
        // ══════════════════════════════════════════════════════════════════
        if (!user.stripeSubscriptionId) {
            console.log("[CHECKOUT] New subscription for user:", user.id);

            const checkoutSession = await stripe.checkout.sessions.create({
                customer: customerId,
                line_items: [{ price: priceId, quantity: 1 }],
                mode: "subscription",
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
                metadata: {
                    userId: user.id,
                    planId: planId,
                },
                allow_promotion_codes: true,
                billing_address_collection: "auto",
            });

            return NextResponse.json({ url: checkoutSession.url });
        }

        // ══════════════════════════════════════════════════════════════════
        // CASE 2 & 3: User HAS active subscription → Update it
        // ══════════════════════════════════════════════════════════════════

        // Verify subscription exists in Stripe
        let subscription;
        try {
            subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        } catch (error) {
            // Subscription doesn't exist in Stripe, create new one
            console.log("[CHECKOUT] Subscription not found in Stripe, creating new:", user.stripeSubscriptionId);

            // Clear invalid subscription data
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeSubscriptionId: null, stripePriceId: null }
            });

            const checkoutSession = await stripe.checkout.sessions.create({
                customer: customerId,
                line_items: [{ price: priceId, quantity: 1 }],
                mode: "subscription",
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
                metadata: {
                    userId: user.id,
                    planId: planId,
                },
                allow_promotion_codes: true,
                billing_address_collection: "auto",
            });

            return NextResponse.json({ url: checkoutSession.url });
        }

        // Check if subscription is active
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            console.log("[CHECKOUT] Subscription not active, creating new:", subscription.status);

            const checkoutSession = await stripe.checkout.sessions.create({
                customer: customerId,
                line_items: [{ price: priceId, quantity: 1 }],
                mode: "subscription",
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
                metadata: {
                    userId: user.id,
                    planId: planId,
                },
                allow_promotion_codes: true,
                billing_address_collection: "auto",
            });

            return NextResponse.json({ url: checkoutSession.url });
        }

        // Get the subscription item ID to update
        const subscriptionItemId = subscription.items.data[0]?.id;
        if (!subscriptionItemId) {
            return new NextResponse("No subscription item found", { status: 400 });
        }

        // Determine if this is an UPGRADE or DOWNGRADE
        const currentPlanOrder = user.plan?.sortOrder ?? 0;
        const targetPlanOrder = targetPlan.sortOrder ?? 0;
        const isUpgrade = targetPlanOrder > currentPlanOrder;

        console.log(`[CHECKOUT] Plan change: ${user.plan?.id || 'none'} (${currentPlanOrder}) → ${targetPlan.id} (${targetPlanOrder}) | ${isUpgrade ? 'UPGRADE' : 'DOWNGRADE'}`);

        if (isUpgrade) {
            // ══════════════════════════════════════════════════════════════════
            // UPGRADE: Immediate change with prorated billing
            // ══════════════════════════════════════════════════════════════════
            console.log("[CHECKOUT] Processing UPGRADE with proration");

            // Update subscription with proration
            const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
                items: [{
                    id: subscriptionItemId,
                    price: priceId,
                }],
                proration_behavior: 'create_prorations',
                payment_behavior: 'pending_if_incomplete', // Require payment for proration
                metadata: {
                    planId: planId,
                }
            });

            // Create and pay the proration invoice immediately
            try {
                const invoice = await stripe.invoices.create({
                    customer: customerId,
                    subscription: user.stripeSubscriptionId,
                    auto_advance: true, // Auto-finalize
                });

                // Pay the invoice immediately
                if (invoice.amount_due > 0) {
                    await stripe.invoices.pay(invoice.id);
                    console.log(`[CHECKOUT] Proration invoice paid: ${invoice.id}, amount: ${invoice.amount_due}`);
                }
            } catch (invoiceError: any) {
                // If no items to invoice, that's okay (might happen if change is tiny)
                if (invoiceError.code !== 'invoice_no_subscription_line_items') {
                    console.error("[CHECKOUT] Invoice error:", invoiceError);
                }
            }

            // Update user's plan in our database
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    planId: planId,
                    stripePriceId: priceId,
                }
            });

            return NextResponse.json({
                success: true,
                message: "Plan actualizado inmediatamente con cobro prorrateado",
                type: "upgrade"
            });

        } else {
            // ══════════════════════════════════════════════════════════════════
            // DOWNGRADE: Schedule change at end of billing period
            // ══════════════════════════════════════════════════════════════════
            console.log("[CHECKOUT] Processing DOWNGRADE at period end");

            await stripe.subscriptions.update(user.stripeSubscriptionId, {
                items: [{
                    id: subscriptionItemId,
                    price: priceId,
                }],
                proration_behavior: 'none', // No proration
                billing_cycle_anchor: 'unchanged', // Keep current billing date
                metadata: {
                    scheduledPlanId: planId, // Track what plan they're moving to
                }
            });

            // Note: We DON'T update the user's planId here
            // The webhook will handle it when the new billing period starts

            // Safely handle period end date
            const periodEndTimestamp = (subscription as any).current_period_end;
            let message: string;
            let effectiveDate: string;

            if (periodEndTimestamp && !isNaN(periodEndTimestamp)) {
                const periodEnd = new Date(periodEndTimestamp * 1000);
                message = `Tu plan cambiará a partir del ${periodEnd.toLocaleDateString('es-MX')}`;
                effectiveDate = periodEnd.toISOString();
            } else {
                message = "Tu plan cambiará al final de tu período de facturación actual";
                effectiveDate = new Date().toISOString();
            }

            return NextResponse.json({
                success: true,
                message,
                type: "downgrade",
                effectiveDate
            });
        }

    } catch (error: any) {
        console.error("[STRIPE_CHECKOUT]", error);
        return new NextResponse(error.message || "Internal Error", { status: 500 });
    }
}
