import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/superadmin/referrals/analytics - Get referral system analytics
export async function GET() {
    const session = await auth();

    if (!session?.user?.role || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Time ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Overview stats
    const [
        totalProfiles,
        activeProfiles,
        totalAssignments,
        activeAssignments,
        totalReferrals,
        totalConverted,
        totalClicks,
        pendingCommissions,
        qualifiedCommissions,
        paidCommissions
    ] = await Promise.all([
        prisma.referralProfile.count(),
        prisma.referralProfile.count({ where: { isActive: true } }),
        prisma.referralAssignment.count(),
        prisma.referralAssignment.count({ where: { status: "ACTIVE" } }),
        prisma.referral.count(),
        prisma.referral.count({ where: { status: { in: ["CONVERTED", "QUALIFIED"] } } }),
        prisma.referralClick.count(),
        prisma.referralCommission.aggregate({
            where: { status: "PENDING" },
            _sum: { totalAmount: true }
        }),
        prisma.referralCommission.aggregate({
            where: { status: "QUALIFIED" },
            _sum: { totalAmount: true }
        }),
        prisma.referralCommission.aggregate({
            where: { status: "PAID" },
            _sum: { totalAmount: true }
        })
    ]);

    // This month stats
    const [
        monthlyReferrals,
        monthlyConverted,
        monthlyClicks,
        monthlyCommissionsCreated
    ] = await Promise.all([
        prisma.referral.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.referral.count({
            where: {
                convertedAt: { gte: startOfMonth },
                status: { in: ["CONVERTED", "QUALIFIED"] }
            }
        }),
        prisma.referralClick.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.referralCommission.aggregate({
            where: { createdAt: { gte: startOfMonth } },
            _sum: { totalAmount: true }
        })
    ]);

    // Last month stats for comparison
    const [lastMonthReferrals, lastMonthConverted] = await Promise.all([
        prisma.referral.count({
            where: {
                createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
            }
        }),
        prisma.referral.count({
            where: {
                convertedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
                status: { in: ["CONVERTED", "QUALIFIED"] }
            }
        })
    ]);

    // Top performers
    const topPerformers = await prisma.referralAssignment.findMany({
        where: { status: "ACTIVE" },
        orderBy: { totalConverted: "desc" },
        take: 10,
        include: {
            user: { select: { id: true, name: true, email: true } },
            profile: { select: { name: true, type: true } }
        }
    });

    // Recent activity
    const recentReferrals = await prisma.referral.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
            assignment: {
                select: {
                    referralCode: true,
                    user: { select: { name: true, email: true } }
                }
            }
        }
    });

    // Conversion funnel (last 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [funnelClicks, funnelRegistered, funnelConverted, funnelQualified] = await Promise.all([
        prisma.referralClick.count({ where: { createdAt: { gte: last30Days } } }),
        prisma.referral.count({
            where: {
                registeredAt: { gte: last30Days },
                status: { in: ["REGISTERED", "CONVERTED", "QUALIFIED"] }
            }
        }),
        prisma.referral.count({
            where: {
                convertedAt: { gte: last30Days },
                status: { in: ["CONVERTED", "QUALIFIED"] }
            }
        }),
        prisma.referral.count({
            where: {
                qualifiedAt: { gte: last30Days },
                status: "QUALIFIED"
            }
        })
    ]);

    // Profile breakdown
    const profileStats = await prisma.referralProfile.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            type: true,
            _count: {
                select: { assignments: true }
            }
        }
    });

    // Calculate growth percentages
    const referralGrowth = lastMonthReferrals > 0
        ? ((monthlyReferrals - lastMonthReferrals) / lastMonthReferrals) * 100
        : 0;
    const conversionGrowth = lastMonthConverted > 0
        ? ((monthlyConverted - lastMonthConverted) / lastMonthConverted) * 100
        : 0;

    return NextResponse.json({
        overview: {
            profiles: { total: totalProfiles, active: activeProfiles },
            assignments: { total: totalAssignments, active: activeAssignments },
            referrals: { total: totalReferrals, converted: totalConverted },
            clicks: totalClicks,
            commissions: {
                pending: Number(pendingCommissions._sum.totalAmount || 0),
                qualified: Number(qualifiedCommissions._sum.totalAmount || 0),
                paid: Number(paidCommissions._sum.totalAmount || 0)
            }
        },
        thisMonth: {
            referrals: monthlyReferrals,
            converted: monthlyConverted,
            clicks: monthlyClicks,
            commissions: Number(monthlyCommissionsCreated._sum.totalAmount || 0),
            growth: {
                referrals: referralGrowth,
                conversions: conversionGrowth
            }
        },
        conversionFunnel: {
            clicks: funnelClicks,
            registered: funnelRegistered,
            converted: funnelConverted,
            qualified: funnelQualified,
            conversionRate: funnelClicks > 0
                ? ((funnelConverted / funnelClicks) * 100).toFixed(2)
                : 0
        },
        topPerformers: topPerformers.map(a => ({
            id: a.id,
            referralCode: a.referralCode,
            user: a.user,
            profile: a.profile,
            totalReferrals: a.totalReferrals,
            totalConverted: a.totalConverted,
            totalEarned: Number(a.totalEarned)
        })),
        recentActivity: recentReferrals.map(r => ({
            id: r.id,
            referredEmail: r.referredEmail,
            status: r.status,
            createdAt: r.createdAt,
            referrer: r.assignment.user
        })),
        profileBreakdown: profileStats.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            assignmentCount: p._count.assignments
        }))
    });
}
