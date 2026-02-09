import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("[CRON] Starting batch commission processing...");

        // Find all active CUSTOMER assignments
        const assignments = await prisma.referralAssignment.findMany({
            where: {
                status: "ACTIVE",
                profile: {
                    type: "CUSTOMER",
                    isActive: true
                }
            },
            include: {
                profile: true,
                user: {
                    select: {
                        id: true,
                        stripeCustomerId: true,
                        email: true
                    }
                }
            }
        });

        console.log(`[CRON] Found ${assignments.length} active customer assignments`);

        const results = [];

        for (const assignment of assignments) {
            try {
                // Get configuration for batch size
                const config = assignment.configOverride as any || assignment.profile.config as any;
                const minReferrals = config?.qualification?.minReferrals || 5; // Default to 5 if not set

                if (minReferrals <= 0) continue; // Should not happen with new config, but safety check

                // Find PENDING commissions for this assignment
                // We need to check if the referred users are still active
                const pendingCommissions = await prisma.referralCommission.findMany({
                    where: {
                        assignmentId: assignment.id,
                        status: "PENDING"
                    },
                    include: {
                        referral: {
                            include: {
                                referredUser: {
                                    select: {
                                        id: true,
                                        planExpiresAt: true,
                                        stripeSubscriptionId: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: "asc" }
                });

                if (pendingCommissions.length === 0) continue;

                // Filter for ACTIVE subscriptions
                // User must have planExpiresAt in future
                const now = new Date();
                const validCommissions = pendingCommissions.filter(c => {
                    const user = c.referral?.referredUser;
                    return user && user.planExpiresAt && new Date(user.planExpiresAt) > now;
                });

                const count = validCommissions.length;


                // Calculate how many NEW batches are ready to be paid from the pending pool.
                // We use floor() to ensure we only pay for complete batches.
                // We do NOT subtract batchesPaid because we are operating on the PENDING pool only.
                // Once paid, they become CREDITED and leave this pool.
                const batchesToPay = Math.floor(count / minReferrals);

                if (batchesToPay > 0) {
                    console.log(`[CRON] User ${assignment.user.email} due for ${batchesToPay} batches (Count: ${count}, Min: ${minReferrals})`);

                    // Identify commissions to pay in this batch
                    // We take the oldest ones that are valid
                    // Note: This logic assumes we pay the oldest valid ones. 
                    // If a user becomes inactive, they drop out of the "valid" pool, potentially delaying the batch.
                    // This matches the requirement "pay only when enrolled users have not canceled".

                    const commissionsToPay = validCommissions.slice(0, batchesToPay * minReferrals);

                    // Calculate total reward
                    let totalReward = 0;
                    const commissionIds = [];

                    for (const comm of commissionsToPay) {
                        totalReward += Number(comm.totalAmount);
                        commissionIds.push(comm.id);
                    }

                    if (totalReward > 0 && assignment.user.stripeCustomerId) {
                        // Apply credit to Stripe
                        const creditAmountCents = Math.round(totalReward * 100);

                        await stripe.customers.createBalanceTransaction(assignment.user.stripeCustomerId, {
                            amount: -creditAmountCents,
                            currency: commissionsToPay[0].currency.toLowerCase(),
                            description: `Recompensa por ${commissionsToPay.length} referidos activos (Lotes: ${batchesToPay})`
                        });

                        // Update commissions to CREDITED
                        await prisma.referralCommission.updateMany({
                            where: { id: { in: commissionIds } },
                            data: {
                                status: "CREDITED" as any,
                                paidAt: new Date()
                            }
                        });

                        // Update assignment batchesPaid
                        await prisma.referralAssignment.update({
                            where: { id: assignment.id },
                            data: {
                                batchesPaid: batchesPaid + batchesToPay,
                                totalEarned: { increment: totalReward }
                            }
                        });

                        results.push({
                            userId: assignment.userId,
                            batchesPaid: batchesToPay,
                            amount: totalReward,
                            referralsCount: commissionsToPay.length
                        });
                    }
                }
            } catch (err) {
                console.error(`[CRON] Error processing assignment ${assignment.id}:`, err);
            }
        }

        return NextResponse.json({ success: true, processed: results });
    } catch (error) {
        console.error("[CRON] Error in batch processing:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
