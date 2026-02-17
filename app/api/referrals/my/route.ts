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

    // Aggregated stats
    const totalReferralsAll = assignmentsWithStats.reduce((sum, a) => sum + (Number(a.totalReferrals) || 0), 0);

    // Add batch progress for CUSTOMER profiles (Restoring logic or initializing null)
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

    // Get User Plan Limits
    const userPlan = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            plan: {
                select: { config: true }
            }
        }
    });

    const planConfig = userPlan?.plan?.config as any || {};
    const features = planConfig.features || {};
    const limits = planConfig.limits || {};

    const referralProgramEnabled = features.referralProgramEnabled ?? false;
    const maxReferrals = limits.maxReferrals ?? 0;

    // Calculate remaining
    // If maxReferrals is -1, it's unlimited.
    // Otherwise, remaining = max - totalReferralsAll
    // Note: We might want to count only specific assignments if they are separate, but usually limits are per user.
    // However, the limit logic in auth.ts checks per assignment (assignment -> user -> plan).
    // So total count for the user is what matters.

    // Let's use the total usage count we calculated or query it fresh if we want to be precise about "non-cancelled"
    // The previous stats might include cancelled? 
    // Let's rely on the stats we already have: totalReferralsAll.
    // But ideally we should filter out cancelled ones if the limit allows retries.
    // For now, simple subtraction is safer to show "attempts used".

    const remainingReferrals = maxReferrals === -1
        ? -1
        : Math.max(0, maxReferrals - totalReferralsAll);

    return NextResponse.json({
        hasProgram: referralProgramEnabled, // Use plan setting to determine if they truly have access
        // If false, frontend shows "Not available". Currently logic used assignment existence.
        // Let's keep existing logic but maybe add a flag.
        // Actually, previous logic returned hasProgram: false if no assignments.
        // Let's keep that.

        limits: {
            max: maxReferrals,
            remaining: remainingReferrals,
            enabled: referralProgramEnabled
        },

        assignments: assignmentsWithStats,
        recentReferrals: allRecentReferrals,
        totalEarned: totalEarnedAll,
        pendingCommissions: pendingCommissionsAll,
        availableBalance: availableBalance,
        commissions: assignmentsWithStats.flatMap(a => a.commissions),
        batchProgress
    });
}
