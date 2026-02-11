import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin";

// GET /api/superadmin/referrals/payouts - List all payout requests
export async function GET() {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const payouts = await prisma.referralPayout.findMany({
            include: {
                assignment: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        },
                        profile: {
                            select: { name: true, type: true }
                        }
                    }
                }
            },
            orderBy: { requestedAt: "desc" }
        });

        return NextResponse.json(payouts);
    } catch (error) {
        console.error("Error fetching payouts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/superadmin/referrals/payouts/:id - Update payout status
export async function PATCH(req: NextRequest) {
    const authError = await requireSuperAdmin();
    if (authError) return authError;

    try {
        const body = await req.json();
        const { id, status, bankReference, failureReason } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const payout = await prisma.referralPayout.findUnique({
            where: { id },
            include: { assignment: true }
        });

        if (!payout) {
            return NextResponse.json({ error: "Payout not found" }, { status: 404 });
        }

        // Update payout status
        const updatedPayout = await prisma.referralPayout.update({
            where: { id },
            data: {
                status,
                bankReference,
                failureReason,
                processedAt: status === "COMPLETED" ? new Date() : payout.processedAt,
                failedAt: status === "FAILED" ? new Date() : payout.failedAt
            }
        });

        // If completed, update totalPaid on assignment and mark commissions as PAID
        if (status === "COMPLETED" && payout.status !== "COMPLETED") {
            await prisma.$transaction([
                prisma.referralAssignment.update({
                    where: { id: payout.assignmentId },
                    data: {
                        totalPaid: { increment: payout.amount }
                    }
                }),
                prisma.referralCommission.updateMany({
                    where: { payoutId: id },
                    data: {
                        status: "PAID",
                        paidAt: new Date()
                    }
                })
            ]);
        }

        return NextResponse.json(updatedPayout);
    } catch (error) {
        console.error("Error updating payout:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
