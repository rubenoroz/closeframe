import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/referrals/my - Get user's referral assignment and stats
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.referralAssignment.findMany({
        where: { userId: session.user.id },
        include: {
            profile: {
                select: { id: true, name: true, type: true, config: true }
            },
            referrals: {
                select: {
                    id: true,
                    referredEmail: true,
                    status: true,
                    clickedAt: true,
                    registeredAt: true,
                    convertedAt: true,
                    qualifiedAt: true,
                    createdAt: true
                },
                orderBy: { createdAt: "desc" },
                take: 50
            },
            commissions: {
                select: {
                    id: true,
                    totalAmount: true,
                    currency: true,
                    status: true,
                    qualifiesAt: true,
                    createdAt: true,
                    referral: {
                        select: {
                            referredEmail: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            },
            _count: {
                select: {
                    referrals: true,
                    commissions: true,
                    payouts: true
                }
            }
        }
    });

    if (assignments.length === 0) {
        return NextResponse.json({
            hasProgram: false,
            message: "You don't have a referral program yet"
        });
    }

    // Calculate stats for each assignment
    const assignmentsWithStats = assignments.map(assignment => {
        const pendingCommissions = assignment.commissions
            .filter(c => c.status === "PENDING")
            .reduce((sum, c) => sum + Number(c.totalAmount), 0);

        const qualifiedCommissions = assignment.commissions
            .filter(c => c.status === "QUALIFIED")
            .reduce((sum, c) => sum + Number(c.totalAmount), 0);

        // Referral funnel stats
        const referralStats = {
            clicked: assignment.referrals.filter(r => r.status === "CLICKED").length,
            registered: assignment.referrals.filter(r => r.status === "REGISTERED").length,
            converted: assignment.referrals.filter(r => r.status === "CONVERTED").length,
            qualified: assignment.referrals.filter(r => r.status === "QUALIFIED").length,
        };

        const config = (assignment.configOverride as any) || (assignment.profile.config as any);

        return {
            id: assignment.id,
            referralCode: assignment.referralCode,
            customSlug: assignment.customSlug,
            status: assignment.status,
            profile: assignment.profile,
            referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/ref/${assignment.customSlug || assignment.referralCode}`,
            // Flatten stats for frontend
            totalClicks: assignment.totalClicks,
            totalReferrals: assignment.totalReferrals,
            totalConverted: assignment.totalConverted,
            totalEarned: Number(assignment.totalEarned),
            totalPaid: Number(assignment.totalPaid),
            pendingCommissions,
            qualifiedCommissions,
            commissions: assignment.commissions,
            referralFunnel: referralStats,
            recentReferrals: assignment.referrals,
            config
        };
    });

    // Aggregate recent referrals from all assignments for top-level display
    const allRecentReferrals = assignments.flatMap(a => a.referrals)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

    // Calculate totals across all assignments
    const totalEarnedAll = assignmentsWithStats.reduce((sum, a) => sum + (Number(a.totalEarned) || 0), 0);
    const totalPaidAll = assignmentsWithStats.reduce((sum, a) => sum + (Number(a.totalPaid) || 0), 0);
    const pendingCommissionsAll = assignmentsWithStats.reduce((sum, a) => sum + (Number(a.pendingCommissions) || 0), 0);
    const availableBalance = Math.max(0, totalEarnedAll - totalPaidAll);

    // Add batch progress for CUSTOMER profiles
    const customerAssignment = assignmentsWithStats.find(a => a.profile.type === "CUSTOMER");
    let batchProgress = null;

    if (customerAssignment) {
        const config = (customerAssignment.config as any);
        const minReferrals = config?.qualification?.minReferrals || 5;

        // Count active referrals for batch
        const activeReferralsCount = await prisma.referral.count({
            where: {
                assignmentId: customerAssignment.id,
                status: { in: ["CONVERTED", "QUALIFIED"] }
            }
        });

        // Calculate progress in current batch
        const currentBatchCount = activeReferralsCount % minReferrals;

        batchProgress = {
            activeReferrals: activeReferralsCount,
            batchSize: minReferrals,
            currentProgress: currentBatchCount,
            nextRewardAt: minReferrals - currentBatchCount
        };
    }

    return NextResponse.json({
        hasProgram: true,
        assignments: assignmentsWithStats,
        recentReferrals: allRecentReferrals,
        totalEarned: totalEarnedAll,
        pendingCommissions: pendingCommissionsAll,
        availableBalance: availableBalance,
        commissions: assignmentsWithStats.flatMap(a => a.commissions),
        batchProgress
    });
}
