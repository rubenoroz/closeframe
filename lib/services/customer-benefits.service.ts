import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { CustomerProfileConfig } from "@/types/referral";

interface BenefitResult {
    success: boolean;
    stripeCouponId?: string;
    discountPercent?: number;
    discountAmount?: number;
    freeMonths?: number;
    error?: string;
}

/**
 * Create or get a Stripe coupon for the referral benefit
 */
async function getOrCreateStripeCoupon(
    benefitType: string,
    value: number,
    duration: number = 1,
    referralCode: string
): Promise<string | null> {
    const couponId = `ref_${referralCode}_${benefitType}_${value}`;

    try {
        // Try to retrieve existing coupon
        const existingCoupon = await stripe.coupons.retrieve(couponId);
        return existingCoupon.id;
    } catch {
        // Coupon doesn't exist, create it
        try {
            let couponParams: any = {
                id: couponId,
                name: `Referral: ${value}% off`,
                duration: duration > 1 ? "repeating" : "once",
            };

            if (benefitType === "PERCENTAGE_DISCOUNT") {
                couponParams.percent_off = value;
                if (duration > 1) {
                    couponParams.duration_months = duration;
                }
            } else if (benefitType === "CREDIT") {
                // For credits, we'll handle differently (customer balance)
                return null;
            } else if (benefitType === "FREE_MONTHS") {
                // 100% off for X months
                couponParams.percent_off = 100;
                couponParams.duration = "repeating";
                couponParams.duration_months = value; // value = number of free months
            }

            const coupon = await stripe.coupons.create(couponParams);
            return coupon.id;
        } catch (error) {
            console.error("[REFERRAL] Failed to create Stripe coupon:", error);
            return null;
        }
    }
}

/**
 * Apply benefit to the referred user at checkout
 */
export async function applyReferredBenefit(
    referralCode: string,
    stripeCustomerId: string,
    email: string
): Promise<BenefitResult> {
    try {
        // Find active assignment
        const assignment = await prisma.referralAssignment.findFirst({
            where: {
                OR: [
                    { referralCode },
                    { customSlug: referralCode }
                ],
                status: "ACTIVE",
                profile: { type: "CUSTOMER" }
            },
            include: {
                profile: true
            }
        });

        if (!assignment) {
            return { success: false, error: "Invalid or inactive referral" };
        }

        const config = (assignment.configOverride || assignment.profile.config) as unknown as CustomerProfileConfig;
        const benefit = config.referredBenefit;

        if (!benefit) {
            return { success: false, error: "No benefit configured" };
        }

        // Check if already has a referral recorded
        const existingReferral = await prisma.referral.findFirst({
            where: { referredEmail: email }
        });

        if (existingReferral && existingReferral.benefitApplied) {
            return { success: false, error: "Benefit already applied" };
        }

        // Apply based on benefit type
        if (benefit.type === "PERCENTAGE_DISCOUNT") {
            const couponId = await getOrCreateStripeCoupon(
                benefit.type,
                benefit.value,
                benefit.duration || 1,
                assignment.referralCode
            );

            if (couponId) {
                // Apply coupon via customer discount (create promotion code first)
                try {
                    // Create a customer-specific discount using the coupon
                    await stripe.subscriptions.list({ customer: stripeCustomerId }).then(async (subs) => {
                        if (subs.data.length > 0) {
                            // Apply to existing subscription using discounts
                            await stripe.subscriptions.update(subs.data[0].id, {
                                discounts: [{ coupon: couponId }]
                            } as any);
                        }
                    });
                } catch (e) {
                    console.log("[REFERRAL] No active subscription to apply coupon to:", e);
                }

                // Record benefit in referral
                if (existingReferral) {
                    await prisma.referral.update({
                        where: { id: existingReferral.id },
                        data: {
                            benefitApplied: {
                                type: benefit.type,
                                value: benefit.value,
                                duration: benefit.duration,
                                stripeCouponId: couponId,
                                appliedAt: new Date().toISOString()
                            }
                        }
                    });
                }

                return {
                    success: true,
                    stripeCouponId: couponId,
                    discountPercent: benefit.value
                };
            }
        } else if (benefit.type === "CREDIT") {
            // Add credit to customer balance
            const creditAmount = benefit.value * 100; // Convert to cents

            await stripe.customers.createBalanceTransaction(stripeCustomerId, {
                amount: -creditAmount, // Negative = credit
                currency: "mxn", // TODO: Make configurable
                description: `Referral credit from ${assignment.referralCode}`
            });

            if (existingReferral) {
                await prisma.referral.update({
                    where: { id: existingReferral.id },
                    data: {
                        benefitApplied: {
                            type: benefit.type,
                            value: benefit.value,
                            appliedAt: new Date().toISOString()
                        }
                    }
                });
            }

            return {
                success: true,
                discountAmount: benefit.value
            };
        } else if (benefit.type === "FREE_MONTHS") {
            const couponId = await getOrCreateStripeCoupon(
                benefit.type,
                benefit.value,
                benefit.value,
                assignment.referralCode
            );

            if (couponId) {
                try {
                    await stripe.subscriptions.list({ customer: stripeCustomerId }).then(async (subs) => {
                        if (subs.data.length > 0) {
                            await stripe.subscriptions.update(subs.data[0].id, {
                                discounts: [{ coupon: couponId }]
                            });
                        }
                    });
                } catch (e) {
                    console.log("[REFERRAL] No subscription for free months:", e);
                }

                if (existingReferral) {
                    await prisma.referral.update({
                        where: { id: existingReferral.id },
                        data: {
                            benefitApplied: {
                                type: benefit.type,
                                value: benefit.value,
                                stripeCouponId: couponId,
                                appliedAt: new Date().toISOString()
                            }
                        }
                    });
                }

                return {
                    success: true,
                    stripeCouponId: couponId,
                    freeMonths: benefit.value
                };
            }
        }

        return { success: false, error: "Failed to apply benefit" };
    } catch (error) {
        console.error("[REFERRAL] Error applying referred benefit:", error);
        return { success: false, error: "Failed to apply benefit" };
    }
}

/**
 * Apply benefit to the referrer when referred user converts
 */
export async function applyReferrerBenefit(
    referralId: string
): Promise<BenefitResult> {
    try {
        const referral = await prisma.referral.findUnique({
            where: { id: referralId },
            include: {
                assignment: {
                    include: {
                        profile: true,
                        user: true
                    }
                }
            }
        });

        if (!referral || referral.assignment.profile.type !== "CUSTOMER") {
            return { success: false, error: "Invalid referral or not a customer profile" };
        }

        const config = (referral.assignment.configOverride ||
            referral.assignment.profile.config) as CustomerProfileConfig;
        const benefit = config.referrerBenefit;

        if (!benefit) {
            return { success: false, error: "No referrer benefit configured" };
        }

        const referrerUser = referral.assignment.user;

        if (!referrerUser.stripeCustomerId) {
            return { success: false, error: "Referrer has no Stripe customer ID" };
        }

        // Check limits
        if (config.limits?.maxReferralsPerMonth) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const monthlyCount = await prisma.referral.count({
                where: {
                    assignmentId: referral.assignmentId,
                    status: { in: ["CONVERTED", "QUALIFIED"] },
                    convertedAt: { gte: startOfMonth }
                }
            });

            if (monthlyCount >= config.limits.maxReferralsPerMonth) {
                return { success: false, error: "Monthly referral limit reached" };
            }
        }

        // Apply based on benefit type
        if (benefit.type === "PERCENTAGE_DISCOUNT") {
            const couponId = await getOrCreateStripeCoupon(
                `referrer_${benefit.type}`,
                benefit.value,
                benefit.duration || 1,
                `${referral.assignment.referralCode}_reward`
            );

            if (couponId) {
                try {
                    await stripe.subscriptions.list({ customer: referrerUser.stripeCustomerId }).then(async (subs) => {
                        if (subs.data.length > 0) {
                            await stripe.subscriptions.update(subs.data[0].id, {
                                discounts: [{ coupon: couponId }]
                            });
                        }
                    });
                } catch (e) {
                    console.log("[REFERRAL] Could not apply referrer coupon:", e);
                }

                // Log the reward
                await prisma.referralAuditLog.create({
                    data: {
                        assignmentId: referral.assignmentId,
                        action: "REFERRER_BENEFIT_APPLIED",
                        actorId: "SYSTEM",
                        actorType: "SYSTEM",
                        metadata: {
                            referralId,
                            benefitType: benefit.type,
                            value: benefit.value,
                            stripeCouponId: couponId
                        }
                    }
                });

                return {
                    success: true,
                    stripeCouponId: couponId,
                    discountPercent: benefit.value
                };
            }
        } else if (benefit.type === "CREDIT") {
            const creditAmount = benefit.value * 100; // Convert to cents

            await stripe.customers.createBalanceTransaction(referrerUser.stripeCustomerId, {
                amount: -creditAmount,
                currency: "mxn",
                description: `Referral reward for ${referral.referredEmail}`
            });

            await prisma.referralAuditLog.create({
                data: {
                    assignmentId: referral.assignmentId,
                    action: "REFERRER_CREDIT_APPLIED",
                    actorId: "SYSTEM",
                    actorType: "SYSTEM",
                    metadata: {
                        referralId,
                        amount: benefit.value
                    }
                }
            });

            return {
                success: true,
                discountAmount: benefit.value
            };
        } else if (benefit.type === "FREE_MONTHS") {
            const couponId = await getOrCreateStripeCoupon(
                `referrer_free`,
                benefit.value,
                benefit.value,
                `${referral.assignment.referralCode}_reward`
            );

            if (couponId) {
                try {
                    await stripe.subscriptions.list({ customer: referrerUser.stripeCustomerId }).then(async (subs) => {
                        if (subs.data.length > 0) {
                            await stripe.subscriptions.update(subs.data[0].id, {
                                discounts: [{ coupon: couponId }]
                            });
                        }
                    });
                } catch (e) {
                    console.log("[REFERRAL] Could not apply free months to referrer:", e);
                }

                return {
                    success: true,
                    stripeCouponId: couponId,
                    freeMonths: benefit.value
                };
            }
        } else if (benefit.type === "PLAN_UPGRADE") {
            // Plan upgrade requires different handling - notify admin
            await prisma.referralAuditLog.create({
                data: {
                    assignmentId: referral.assignmentId,
                    action: "PLAN_UPGRADE_PENDING",
                    actorId: "SYSTEM",
                    actorType: "SYSTEM",
                    metadata: {
                        referralId,
                        referrerUserId: referrerUser.id,
                        benefitValue: benefit.value
                    }
                }
            });

            return { success: true };
        }

        return { success: false, error: "Failed to apply referrer benefit" };
    } catch (error) {
        console.error("[REFERRAL] Error applying referrer benefit:", error);
        return { success: false, error: "Failed to apply referrer benefit" };
    }
}

/**
 * Get available benefits for checkout display
 */
export async function getCheckoutBenefits(
    referralCode: string | null,
    email: string
): Promise<{
    hasReferral: boolean;
    referredBenefit?: {
        type: string;
        value: number;
        duration?: number;
        description: string;
    };
}> {
    if (!referralCode) {
        return { hasReferral: false };
    }

    const assignment = await prisma.referralAssignment.findFirst({
        where: {
            OR: [
                { referralCode },
                { customSlug: referralCode }
            ],
            status: "ACTIVE",
            profile: { type: "CUSTOMER" }
        },
        include: {
            profile: true
        }
    });

    if (!assignment) {
        return { hasReferral: false };
    }

    // Check if already used
    const existingReferral = await prisma.referral.findFirst({
        where: { referredEmail: email }
    });

    if (existingReferral?.benefitApplied) {
        return { hasReferral: false };
    }

    const config = (assignment.configOverride || assignment.profile.config) as CustomerProfileConfig;
    const benefit = config.referredBenefit;

    if (!benefit) {
        return { hasReferral: false };
    }

    // Build human-readable description
    let description = "";
    if (benefit.type === "PERCENTAGE_DISCOUNT") {
        description = `${benefit.value}% de descuento`;
        if (benefit.duration && benefit.duration > 1) {
            description += ` por ${benefit.duration} meses`;
        } else {
            description += " en tu primer pago";
        }
    } else if (benefit.type === "CREDIT") {
        description = `$${benefit.value} de crédito en tu cuenta`;
    } else if (benefit.type === "FREE_MONTHS") {
        description = `${benefit.value} ${benefit.value === 1 ? 'mes gratis' : 'meses gratis'}`;
    }

    return {
        hasReferral: true,
        referredBenefit: {
            type: benefit.type,
            value: benefit.value,
            duration: benefit.duration,
            description
        }
    };
}
