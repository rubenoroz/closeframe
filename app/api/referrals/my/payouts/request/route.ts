import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// POST /api/referrals/my/payouts/request - Request payout
export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Find user's affiliate assignment
        const assignment = await prisma.referralAssignment.findFirst({
            where: {
                userId: session.user.id,
                status: "ACTIVE",
                profile: { type: "AFFILIATE" }
            },
            include: {
                profile: true
            }
        });

        if (!assignment) {
            return NextResponse.json(
                { error: "No affiliate program found" },
                { status: 404 }
            );
        }

        // Get qualified commissions not yet in a payout
        const qualifiedCommissions = await prisma.referralCommission.findMany({
            where: {
                assignmentId: assignment.id,
                status: "QUALIFIED",
                payoutId: null
            }
        });

        if (qualifiedCommissions.length === 0) {
            return NextResponse.json(
                { error: "No qualified commissions available for payout" },
                { status: 400 }
            );
        }

        // Calculate total
        const totalAmount = qualifiedCommissions.reduce((sum, c) => {
            const amount = c.adjustedAmount || c.totalAmount;
            return sum + Number(amount);
        }, 0);

        // Get config for threshold check
        const config = (assignment.configOverride as any) || (assignment.profile.config as any);
        const minThreshold = config?.payoutSettings?.minThreshold || 500;

        if (totalAmount < minThreshold) {
            return NextResponse.json({
                error: `Minimum payout threshold is $${minThreshold}. Current balance: $${totalAmount.toFixed(2)}`,
                balance: totalAmount,
                threshold: minThreshold
            }, { status: 400 });
        }

        // Create payout record
        const payout = await prisma.referralPayout.create({
            data: {
                assignmentId: assignment.id,
                amount: totalAmount,
                currency: qualifiedCommissions[0]?.currency || "MXN",
                method: assignment.payoutMethod,
                status: "PENDING"
            }
        });

        // Link commissions to payout
        await prisma.referralCommission.updateMany({
            where: {
                id: { in: qualifiedCommissions.map(c => c.id) }
            },
            data: {
                payoutId: payout.id
            }
        });

        // If using Stripe Connect and account is set up, initiate transfer
        if (assignment.payoutMethod === "STRIPE_CONNECT" && assignment.stripeConnectId) {
            try {
                const transfer = await stripe.transfers.create({
                    amount: Math.round(totalAmount * 100), // Convert to cents
                    currency: payout.currency.toLowerCase(),
                    destination: assignment.stripeConnectId,
                    description: `Closerlens referral payout - ${qualifiedCommissions.length} commissions`,
                    metadata: {
                        payoutId: payout.id,
                        assignmentId: assignment.id,
                        userId: session.user.id
                    }
                });

                await prisma.referralPayout.update({
                    where: { id: payout.id },
                    data: {
                        status: "PROCESSING",
                        stripeTransferId: transfer.id
                    }
                });

                // Log audit
                await prisma.referralAuditLog.create({
                    data: {
                        assignmentId: assignment.id,
                        action: "PAYOUT_INITIATED",
                        actorId: session.user.id,
                        actorType: "USER",
                        metadata: {
                            payoutId: payout.id,
                            amount: totalAmount,
                            stripeTransferId: transfer.id
                        }
                    }
                });

                return NextResponse.json({
                    success: true,
                    payout: {
                        id: payout.id,
                        amount: totalAmount,
                        status: "PROCESSING",
                        method: "STRIPE_CONNECT"
                    }
                });
            } catch (stripeError: any) {
                console.error("[REFERRAL] Stripe transfer failed:", stripeError);

                await prisma.referralPayout.update({
                    where: { id: payout.id },
                    data: {
                        status: "FAILED",
                        failedAt: new Date(),
                        failureReason: stripeError.message
                    }
                });

                // Unlink commissions from failed payout
                await prisma.referralCommission.updateMany({
                    where: { payoutId: payout.id },
                    data: { payoutId: null }
                });

                return NextResponse.json(
                    { error: "Stripe transfer failed", details: stripeError.message },
                    { status: 500 }
                );
            }
        }

        // For manual payout methods, just mark as pending
        await prisma.referralAuditLog.create({
            data: {
                assignmentId: assignment.id,
                action: "PAYOUT_REQUESTED",
                actorId: session.user.id,
                actorType: "USER",
                metadata: {
                    payoutId: payout.id,
                    amount: totalAmount,
                    method: assignment.payoutMethod
                }
            }
        });

        return NextResponse.json({
            success: true,
            payout: {
                id: payout.id,
                amount: totalAmount,
                status: "PENDING",
                method: assignment.payoutMethod,
                message: "Payout request submitted. Please wait for admin approval."
            }
        });
    } catch (error) {
        console.error("[REFERRAL] Error requesting payout:", error);
        return NextResponse.json(
            { error: "Failed to request payout" },
            { status: 500 }
        );
    }
}

// GET /api/referrals/my/payouts/request - Get payout status and balance
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignment = await prisma.referralAssignment.findFirst({
        where: {
            userId: session.user.id,
            profile: { type: "AFFILIATE" }
        },
        include: {
            profile: true,
            payouts: {
                orderBy: { createdAt: "desc" },
                take: 10
            }
        }
    });

    if (!assignment) {
        return NextResponse.json(
            { error: "No affiliate program found" },
            { status: 404 }
        );
    }

    // Calculate available balance (qualified, not in payout)
    const qualifiedCommissions = await prisma.referralCommission.findMany({
        where: {
            assignmentId: assignment.id,
            status: "QUALIFIED",
            payoutId: null
        }
    });

    const availableBalance = qualifiedCommissions.reduce((sum, c) => {
        const amount = c.adjustedAmount || c.totalAmount;
        return sum + Number(amount);
    }, 0);

    // Calculate pending balance (waiting for grace period)
    const pendingCommissions = await prisma.referralCommission.findMany({
        where: {
            assignmentId: assignment.id,
            status: "PENDING"
        }
    });

    const pendingBalance = pendingCommissions.reduce((sum, c) => {
        return sum + Number(c.totalAmount);
    }, 0);

    const config = (assignment.configOverride as any) || (assignment.profile.config as any);

    return NextResponse.json({
        availableBalance,
        pendingBalance,
        totalEarned: Number(assignment.totalEarned),
        totalPaid: Number(assignment.totalPaid),
        payoutMethod: assignment.payoutMethod,
        minThreshold: config?.payoutSettings?.minThreshold || 500,
        canRequestPayout: availableBalance >= (config?.payoutSettings?.minThreshold || 500),
        recentPayouts: assignment.payouts.map(p => ({
            id: p.id,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status,
            method: p.method,
            requestedAt: p.requestedAt,
            processedAt: p.processedAt
        }))
    });
}
