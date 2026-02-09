import { prisma } from "@/lib/db";
import { AffiliateProfileConfig, REFERRAL_COOKIE_NAME } from "@/types/referral";
import { ReferralAssignment, Referral, ReferralProfile } from "@prisma/client";

interface CommissionCalculationResult {
    success: boolean;
    commissionId?: string;
    amount?: number;
    error?: string;
}

interface ReferralConversionResult {
    success: boolean;
    referralId?: string;
    assignmentId?: string;
    error?: string;
}

interface AutoAssignResult {
    success: boolean;
    assignmentId?: string;
    referralCode?: string;
    error?: string;
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(prefix: string = "CL"): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = prefix;
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Auto-assign referral code to a paying customer
 * Called when a user completes their first subscription payment
 */
export async function autoAssignReferralCode(
    userId: string
): Promise<AutoAssignResult> {
    try {
        // Check if user already has an assignment
        const existingAssignment = await prisma.referralAssignment.findFirst({
            where: { userId }
        });

        if (existingAssignment) {
            return {
                success: true,
                assignmentId: existingAssignment.id,
                referralCode: existingAssignment.customSlug || existingAssignment.referralCode
            };
        }

        // Find the "Cliente" profile (type = CUSTOMER)
        const customerProfile = await prisma.referralProfile.findFirst({
            where: {
                type: "CUSTOMER",
                isActive: true
            }
        });

        if (!customerProfile) {
            console.log("[REFERRAL] No active CUSTOMER profile found for auto-assignment");
            return { success: false, error: "No customer profile configured" };
        }

        // Generate unique referral code
        let referralCode = generateReferralCode();
        let attempts = 0;

        while (attempts < 10) {
            const exists = await prisma.referralAssignment.findUnique({
                where: { referralCode }
            });
            if (!exists) break;
            referralCode = generateReferralCode();
            attempts++;
        }

        // Create assignment
        const assignment = await prisma.referralAssignment.create({
            data: {
                userId,
                profileId: customerProfile.id,
                referralCode,
                status: "ACTIVE"
            }
        });

        console.log(`[REFERRAL] Auto-assigned referral code ${referralCode} to user ${userId}`);

        return {
            success: true,
            assignmentId: assignment.id,
            referralCode
        };
    } catch (error) {
        console.error("[REFERRAL] Error auto-assigning referral code:", error);
        return { success: false, error: "Failed to auto-assign referral code" };
    }
}

/**
 * Find active referral assignment by code
 */
export async function findActiveAssignment(code: string) {
    return await prisma.referralAssignment.findFirst({
        where: {
            OR: [
                { referralCode: code },
                { customSlug: code }
            ],
            status: "ACTIVE"
        },
        include: {
            profile: true,
            user: {
                select: { id: true, email: true }
            }
        }
    });
}

/**
 * Get effective configuration (with overrides)
 */
export function getEffectiveConfig(
    assignment: ReferralAssignment & { profile: ReferralProfile }
): AffiliateProfileConfig {
    const baseConfig = assignment.profile.config as AffiliateProfileConfig;
    const override = assignment.configOverride as Partial<AffiliateProfileConfig> | null;

    if (!override) return baseConfig;

    // Deep merge override into base config
    return {
        ...baseConfig,
        ...override,
        reward: { ...baseConfig.reward, ...(override.reward || {}) },
        duration: { ...baseConfig.duration, ...(override.duration || {}) },
        limits: { ...baseConfig.limits, ...(override.limits || {}) },
        qualification: { ...baseConfig.qualification, ...(override.qualification || {}) },
        payoutSettings: { ...baseConfig.payoutSettings, ...(override.payoutSettings || {}) },
    };
}

/**
 * Create or update a referral when a user registers
 */
export async function createReferralOnRegistration(
    referralCode: string,
    referredEmail: string,
    referredUserId: string,
    metadata?: {
        sourceIp?: string;
        userAgent?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
    }
): Promise<ReferralConversionResult> {
    try {
        const assignment = await findActiveAssignment(referralCode);

        if (!assignment) {
            return { success: false, error: "Invalid or inactive referral code" };
        }

        // Check for self-referral
        if (assignment.user.email === referredEmail) {
            return { success: false, error: "Self-referral not allowed" };
        }

        // Check if email was already referred
        const existingReferral = await prisma.referral.findFirst({
            where: { referredEmail }
        });

        if (existingReferral) {
            // Update existing referral with user ID if not already set
            if (!existingReferral.referredUserId) {
                await prisma.referral.update({
                    where: { id: existingReferral.id },
                    data: {
                        referredUserId,
                        status: "REGISTERED",
                        registeredAt: new Date()
                    }
                });
            }
            return {
                success: true,
                referralId: existingReferral.id,
                assignmentId: existingReferral.assignmentId
            };
        }

        // Create new referral
        const referral = await prisma.referral.create({
            data: {
                assignmentId: assignment.id,
                referredEmail,
                referredUserId,
                status: "REGISTERED",
                registeredAt: new Date(),
                sourceIp: metadata?.sourceIp,
                userAgent: metadata?.userAgent,
                utmSource: metadata?.utmSource,
                utmMedium: metadata?.utmMedium,
                utmCampaign: metadata?.utmCampaign
            }
        });

        // Update assignment metrics
        await prisma.referralAssignment.update({
            where: { id: assignment.id },
            data: { totalReferrals: { increment: 1 } }
        });

        return {
            success: true,
            referralId: referral.id,
            assignmentId: assignment.id
        };
    } catch (error) {
        console.error("[REFERRAL] Error creating referral on registration:", error);
        return { success: false, error: "Failed to create referral" };
    }
}

/**
 * Calculate and create commission when a payment is made
 */
export async function calculateCommissionOnPayment(
    stripeCustomerId: string,
    stripePaymentId: string,
    stripeInvoiceId: string | null,
    paymentAmount: number, // Amount in cents
    currency: string,
    referralCode?: string, // NEW: Optional code from Stripe metadata
    userId?: string // NEW: Optional direct user ID to avoid race conditions
): Promise<CommissionCalculationResult> {
    try {
        // Find user by direct ID or Stripe customer ID
        let user;
        if (userId) {
            user = await prisma.user.findUnique({ where: { id: userId } });
        }

        if (!user) {
            user = await prisma.user.findFirst({
                where: { stripeCustomerId }
            });
        }

        if (!user) {
            console.log("[REFERRAL] No user found for Stripe customer:", stripeCustomerId);
            return { success: false, error: "User not found" };
        }

        // Find referral for this user
        let referral = await prisma.referral.findFirst({
            where: {
                referredUserId: user.id,
                status: { in: ["REGISTERED", "CONVERTED", "QUALIFIED"] }
            },
            include: {
                assignment: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        // NEW: If no referral found but we have a code from Stripe metadata, create it now
        if (!referral && referralCode) {
            console.log(`[REFERRAL] No referral found for user ${user.id}, but found code in metadata: ${referralCode}. Creating now...`);
            const conversion = await createReferralOnRegistration(
                referralCode,
                user.email || "",
                user.id,
                { sourceIp: "STRIPE_WEBHOOK" }
            );

            if (conversion.success) {
                // Fetch the newly created referral with assignment
                referral = await prisma.referral.findFirst({
                    where: { id: conversion.referralId },
                    include: {
                        assignment: {
                            include: {
                                profile: true
                            }
                        }
                    }
                });
            }
        }

        if (!referral) {
            console.log("[REFERRAL] No referral record found or could be created for user:", user.id);
            return { success: false, error: "No referral found" };
        }

        // Check if assignment is still active
        if (referral.assignment.status !== "ACTIVE") {
            console.log("[REFERRAL] Assignment not active:", referral.assignment.id);
            return { success: false, error: "Referral assignment not active" };
        }

        const profileType = referral.assignment.profile.type;
        const config = getEffectiveConfig(referral.assignment as any);

        // Check if commission/credit already exists for this payment
        const existingCommission = await prisma.referralCommission.findFirst({
            where: { stripePaymentId }
        });

        if (existingCommission) {
            console.log("[REFERRAL] Commission already exists for payment:", stripePaymentId);
            return { success: true, commissionId: existingCommission.id };
        }

        // Calculate commission/credit amount
        const baseAmount = paymentAmount / 100; // Convert cents to dollars/pesos
        let rewardAmount = 0;
        let commissionRate = 0;
        let fixedAmount = 0;

        // Determine tier-based percentage if tiers exist
        const totalConverted = referral.assignment.totalConverted;
        if (config.tiers && config.tiers.length > 0) {
            const applicableTier = [...config.tiers]
                .sort((a, b) => b.minReferrals - a.minReferrals)
                .find(tier => totalConverted >= tier.minReferrals);

            commissionRate = applicableTier?.percentage || config.reward.percentage || 0;
        } else {
            commissionRate = config.reward.percentage || 0;
        }

        // Calculate based on reward type
        if (config.reward.type === "PERCENTAGE") {
            rewardAmount = baseAmount * commissionRate;
        } else if (config.reward.type === "FIXED") {
            fixedAmount = config.reward.fixedAmount || 0;
            rewardAmount = fixedAmount;
        } else if (config.reward.type === "HYBRID") {
            fixedAmount = config.reward.fixedAmount || 0;
            rewardAmount = (baseAmount * commissionRate) + fixedAmount;
        }

        // Check monthly limits
        if (config.limits.maxMonthlyCommission) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const monthlyTotal = await prisma.referralCommission.aggregate({
                where: {
                    assignmentId: referral.assignmentId,
                    createdAt: { gte: startOfMonth },
                    status: { in: ["PENDING", "QUALIFIED", "PAID", "CREDITED"] }
                },
                _sum: { totalAmount: true }
            });

            const currentMonthly = Number(monthlyTotal._sum.totalAmount || 0);
            if (currentMonthly + rewardAmount > config.limits.maxMonthlyCommission) {
                rewardAmount = Math.max(0, config.limits.maxMonthlyCommission - currentMonthly);

                if (rewardAmount === 0) {
                    console.log("[REFERRAL] Monthly limit reached");
                    return { success: false, error: "Monthly limit reached" };
                }
            }
        }

        // Get referrer user for credit/payout
        const referrerUser = await prisma.user.findUnique({
            where: { id: referral.assignment.userId },
            select: { stripeCustomerId: true, email: true }
        });

        // Handle based on profile type
        if (profileType === "CUSTOMER") {
            // CUSTOMER: Reward only on FIRST payment
            // Check if this referral already has a commission (meaning this is a subsequent payment)
            const previousCommission = await prisma.referralCommission.findFirst({
                where: { referralId: referral.id }
            });

            if (previousCommission) {
                console.log(`[REFERRAL] Commission already exists for referral ${referral.id}, skipping subsequent payment commission for CUSTOMER`);
                return { success: true, commissionId: null };
            }

            // Create commission record with PENDING status (will be processed by batch cron)
            const commission = await prisma.referralCommission.create({
                data: {
                    assignmentId: referral.assignmentId,
                    referralId: referral.id,
                    stripePaymentId,
                    stripeInvoiceId,
                    baseAmount,
                    commissionRate,
                    fixedAmount,
                    totalAmount: rewardAmount,
                    currency: currency.toUpperCase(),
                    status: "PENDING", // Wait for batch processing
                    qualifiesAt: new Date()
                }
            });

            console.log(`[REFERRAL] Commission created (Pending Batch): ${commission.id} for $${rewardAmount} ${currency}`);

            // Update referral status
            if (referral.status === "REGISTERED") {
                await prisma.referral.update({
                    where: { id: referral.id },
                    data: { status: "CONVERTED", convertedAt: new Date() }
                });

                // Only increment totalConverted, NOT totalEarned (wait for actual payout)
                await prisma.referralAssignment.update({
                    where: { id: referral.assignmentId },
                    data: {
                        totalConverted: { increment: 1 }
                    }
                });
            }

            return { success: true, commissionId: commission.id, amount: rewardAmount };
        } else {
            // AFFILIATE: Create monetary commission for payout
            const gracePeriodDays = config.qualification.gracePeriodDays || 30;
            const qualifiesAt = new Date();
            qualifiesAt.setDate(qualifiesAt.getDate() + gracePeriodDays);

            const commission = await prisma.referralCommission.create({
                data: {
                    assignmentId: referral.assignmentId,
                    referralId: referral.id,
                    stripePaymentId,
                    stripeInvoiceId,
                    baseAmount,
                    commissionRate,
                    fixedAmount,
                    totalAmount: rewardAmount,
                    currency: currency.toUpperCase(),
                    status: "PENDING",
                    qualifiesAt
                }
            });

            // Update referral status if first conversion
            if (referral.status === "REGISTERED") {
                await prisma.referral.update({
                    where: { id: referral.id },
                    data: { status: "CONVERTED", convertedAt: new Date() }
                });
                await prisma.referralAssignment.update({
                    where: { id: referral.assignmentId },
                    data: { totalConverted: { increment: 1 } }
                });
            }

            console.log(`[REFERRAL] Commission created: ${commission.id} for $${rewardAmount} ${currency}`);

            return { success: true, commissionId: commission.id, amount: rewardAmount };
        }
    } catch (error) {
        console.error("[REFERRAL] Error calculating commission:", error);
        return { success: false, error: "Failed to calculate commission" };
    }
}

/**
 * Handle refund - adjust or cancel commission
 */
export async function handleRefund(
    stripePaymentId: string,
    refundAmount: number, // Amount in cents
    isFullRefund: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const commission = await prisma.referralCommission.findFirst({
            where: { stripePaymentId }
        });

        if (!commission) {
            console.log("[REFERRAL] No commission found for payment:", stripePaymentId);
            return { success: true }; // Not an error, just no commission to adjust
        }

        if (commission.status === "PAID") {
            // Commission already paid - may need manual review
            console.log("[REFERRAL] Commission already paid, marking for review:", commission.id);
            await prisma.referralCommission.update({
                where: { id: commission.id },
                data: {
                    status: "ADJUSTED",
                    adjustmentReason: `Refund after payout: ${isFullRefund ? 'FULL' : 'PARTIAL'} - $${refundAmount / 100}`
                }
            });
            return { success: true };
        }

        if (isFullRefund) {
            // Full refund - cancel commission
            await prisma.referralCommission.update({
                where: { id: commission.id },
                data: {
                    status: "CANCELLED",
                    adjustmentReason: "Full refund"
                }
            });

            // Update referral status
            await prisma.referral.update({
                where: { id: commission.referralId },
                data: {
                    status: "REFUNDED",
                    cancelledAt: new Date()
                }
            });

            console.log("[REFERRAL] Commission cancelled due to full refund:", commission.id);
        } else {
            // Partial refund - adjust commission proportionally
            const refundRatio = (refundAmount / 100) / Number(commission.baseAmount);
            const adjustedAmount = Number(commission.totalAmount) * (1 - refundRatio);

            await prisma.referralCommission.update({
                where: { id: commission.id },
                data: {
                    adjustedAmount,
                    adjustmentReason: `Partial refund: $${refundAmount / 100}`
                }
            });

            console.log(`[REFERRAL] Commission adjusted from $${commission.totalAmount} to $${adjustedAmount}`);
        }

        return { success: true };
    } catch (error) {
        console.error("[REFERRAL] Error handling refund:", error);
        return { success: false, error: "Failed to handle refund" };
    }
}

/**
 * Handle chargeback - suspend commission and flag for review
 */
export async function handleChargeback(
    stripePaymentId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const commission = await prisma.referralCommission.findFirst({
            where: { stripePaymentId },
            include: {
                assignment: true,
                referral: true
            }
        });

        if (!commission) {
            return { success: true };
        }

        // Mark commission as adjusted
        await prisma.referralCommission.update({
            where: { id: commission.id },
            data: {
                status: "CANCELLED",
                adjustmentReason: "Chargeback"
            }
        });

        // Mark referral as fraudulent
        await prisma.referral.update({
            where: { id: commission.referralId },
            data: {
                status: "FRAUDULENT"
            }
        });

        // Log audit
        await prisma.referralAuditLog.create({
            data: {
                assignmentId: commission.assignmentId,
                action: "CHARGEBACK_DETECTED",
                actorId: "SYSTEM",
                actorType: "SYSTEM",
                metadata: {
                    stripePaymentId,
                    commissionId: commission.id,
                    referralId: commission.referralId
                }
            }
        });

        console.log("[REFERRAL] Chargeback handled, commission cancelled:", commission.id);

        return { success: true };
    } catch (error) {
        console.error("[REFERRAL] Error handling chargeback:", error);
        return { success: false, error: "Failed to handle chargeback" };
    }
}

/**
 * Process qualified commissions (run via cron job)
 */
export async function processQualifiedCommissions(): Promise<number> {
    const now = new Date();

    const pendingCommissions = await prisma.referralCommission.findMany({
        where: {
            status: "PENDING",
            qualifiesAt: { lte: now }
        },
        include: {
            assignment: true,
            referral: true
        }
    });

    let processed = 0;

    for (const commission of pendingCommissions) {
        // Check referral is still valid
        if (commission.referral.status === "REFUNDED" ||
            commission.referral.status === "FRAUDULENT" ||
            commission.referral.status === "CANCELLED") {
            await prisma.referralCommission.update({
                where: { id: commission.id },
                data: { status: "CANCELLED", adjustmentReason: "Referral invalid" }
            });
            continue;
        }

        // Update commission status to QUALIFIED
        await prisma.referralCommission.update({
            where: { id: commission.id },
            data: { status: "QUALIFIED" }
        });

        // Update referral status if needed
        if (commission.referral.status === "CONVERTED") {
            await prisma.referral.update({
                where: { id: commission.referralId },
                data: {
                    status: "QUALIFIED",
                    qualifiedAt: now
                }
            });
        }

        // Update assignment earned total
        const effectiveAmount = commission.adjustedAmount || commission.totalAmount;
        await prisma.referralAssignment.update({
            where: { id: commission.assignmentId },
            data: {
                totalEarned: { increment: Number(effectiveAmount) }
            }
        });

        processed++;
    }

    console.log(`[REFERRAL] Processed ${processed} qualified commissions`);
    return processed;
}
