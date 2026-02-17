
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
});

import { cookies } from "next/headers";
import { REFERRAL_COOKIE_NAME } from "@/types/referral";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { planId, priceId, amount, currency, description } = body;

        // Get user once with everything we might need
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                plan: true,
                stripeConnectAccount: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get Referral Code from cookie
        const cookieStore = await cookies();
        const referralCode = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;

        // ---- CASE 1: Plan Subscription (Platform) ----
        if (planId && priceId) {
            // Create Platform Subscription Checkout Session
            const checkoutSession = await stripe.checkout.sessions.create({
                mode: "subscription",
                payment_method_types: ["card"],
                customer: user.stripeCustomerId || undefined,
                customer_email: !user.stripeCustomerId ? user.email || undefined : undefined,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                subscription_data: {
                    metadata: {
                        userId: user.id,
                        planId: planId,
                        referralCode: referralCode || ""
                    },
                },
                metadata: {
                    userId: user.id,
                    planId: planId,
                    referralCode: referralCode || ""
                },
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancel=true`,
                allow_promotion_codes: true,
            });

            console.log(`[STRIPE] Created subscription session for user ${user.id}, plan ${planId}. Referral: ${referralCode || 'none'}`);
            return NextResponse.json({ url: checkoutSession.url });
        }

        // ---- CASE 2: Direct Payment (Connect) ----
        if (amount && description) {
            // 1. Get User's Connect Account
            const connectId = user.stripeConnectAccount?.stripeAccountId;

            if (!connectId) {
                return NextResponse.json({ error: "No connected Stripe account found" }, { status: 400 });
            }

            // Get effective plan config with limits
            const planConfig = user.plan?.config ? JSON.parse(JSON.stringify(user.plan.config)) : {};
            const limits = planConfig.limits || {};

            // Get commission percentage from plan limits (search in this order: user specific override -> plan default -> global default)
            // Note: limits are flattened in getEffectivePlanConfig but here we might be accessing raw plan config
            // Ideally we should use a helper, but for now let's access specific plan defaults if not on user plan

            // Actually, we can just look at the Plans config based on plan name if config is empty
            const planName = user.plan?.name || "FREE";
            const defaultCommission = 15; // Fallback

            let commissionPercent = limits.commissionPercentage;

            if (commissionPercent === undefined) {
                // Try to find in static config based on plan name
                const { PLANS } = require("@/lib/plans.config");
                const staticPlan = Object.values(PLANS).find((p: any) => p.name === planName) as any;
                commissionPercent = staticPlan?.limits?.commissionPercentage ?? defaultCommission;
            }

            // Calculate fee
            // Amount is in dollars/pesos, convert to cents first
            const amountInCents = Math.round(amount * 100);
            const applicationFeeAmount = Math.round(amountInCents * (commissionPercent / 100));

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
                                unit_amount: amountInCents, // Use pre-calculated cents
                            },
                            quantity: 1,
                        },
                    ],
                    payment_intent_data: {
                        application_fee_amount: applicationFeeAmount,
                        metadata: {
                            userId: session.user.id,
                            referralCode: referralCode || ""
                        }
                    },
                    metadata: {
                        userId: session.user.id,
                        referralCode: referralCode || ""
                    },
                    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?success=payment_created`,
                    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?cancel=true`,
                },
                {
                    stripeAccount: connectId, // Create on THEIR account
                }
            );

            await prisma.payment.create({
                data: {
                    connectAccountId: user!.stripeConnectAccount!.id,
                    stripePaymentIntentId: checkoutSession.payment_intent as string || `sess_${checkoutSession.id}`,
                    stripeSessionId: checkoutSession.id,
                    amount: amountInCents,
                    currency: currency || "usd",
                    description,
                    status: "pending",
                    applicationFee: applicationFeeAmount,
                },
            });

            return NextResponse.json({ url: checkoutSession.url });
        }

        return NextResponse.json({ error: "Invalid request: Provide either planId/priceId or amount/description" }, { status: 400 });

    } catch (error: any) {
        console.error("Create Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
