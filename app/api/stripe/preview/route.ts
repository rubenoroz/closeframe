import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// Preview what an upgrade/downgrade would cost - NO actual changes
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

        // Get user with current plan
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                plan: { select: { id: true, name: true, displayName: true, sortOrder: true } }
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Get target plan
        const targetPlan = await prisma.plan.findUnique({
            where: { id: planId },
            select: { id: true, name: true, displayName: true, sortOrder: true }
        });

        if (!targetPlan) {
            return new NextResponse("Target plan not found", { status: 404 });
        }

        // No subscription - will redirect to Stripe (no preview needed)
        if (!user.stripeSubscriptionId) {
            return NextResponse.json({
                type: "new_subscription",
                message: "Se te redirigirá a Stripe para completar el pago",
                requiresConfirmation: false
            });
        }

        // Get subscription from Stripe
        let subscription;
        try {
            subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        } catch {
            return NextResponse.json({
                type: "new_subscription",
                message: "Se te redirigirá a Stripe para completar el pago",
                requiresConfirmation: false
            });
        }

        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            return NextResponse.json({
                type: "new_subscription",
                message: "Se te redirigirá a Stripe para completar el pago",
                requiresConfirmation: false
            });
        }

        // Determine upgrade or downgrade
        const currentPlanOrder = user.plan?.sortOrder ?? 0;
        const targetPlanOrder = targetPlan.sortOrder ?? 0;
        const isUpgrade = targetPlanOrder > currentPlanOrder;

        if (isUpgrade) {
            // Calculate proration preview using Stripe's API
            const subscriptionItemId = subscription.items.data[0]?.id;

            const preview = await stripe.invoices.createPreview({
                customer: user.stripeCustomerId!,
                subscription: user.stripeSubscriptionId,
                subscription_details: {
                    items: [{
                        id: subscriptionItemId,
                        price: priceId,
                    }],
                    proration_behavior: 'create_prorations',
                }
            });

            // Get proration amount (the difference to be charged now)
            const prorationAmount = (preview.lines.data as any[])
                .filter((line) => line.proration)
                .reduce((sum, line) => sum + line.amount, 0);

            const currency = preview.currency.toUpperCase();
            const formattedAmount = new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: currency
            }).format(prorationAmount / 100);

            return NextResponse.json({
                type: "upgrade",
                currentPlan: user.plan?.displayName || user.plan?.name || "Free",
                newPlan: targetPlan.displayName || targetPlan.name,
                prorationAmount: prorationAmount / 100,
                formattedAmount,
                currency,
                message: `Se te cobrará ${formattedAmount} ahora por la diferencia prorrateada.`,
                requiresConfirmation: true
            });

        } else {
            // Downgrade - no immediate charge
            const periodEnd = new Date((subscription as any).current_period_end * 1000);

            return NextResponse.json({
                type: "downgrade",
                currentPlan: user.plan?.displayName || user.plan?.name || "Free",
                newPlan: targetPlan.displayName || targetPlan.name,
                effectiveDate: periodEnd.toISOString(),
                formattedDate: periodEnd.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                }),
                message: `Tu plan cambiará a ${targetPlan.displayName || targetPlan.name} el ${periodEnd.toLocaleDateString('es-MX')}.`,
                requiresConfirmation: true
            });
        }

    } catch (error: any) {
        console.error("[STRIPE_PREVIEW]", error);
        return new NextResponse(error.message || "Internal Error", { status: 500 });
    }
}
