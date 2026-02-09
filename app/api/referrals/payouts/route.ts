import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// POST /api/referrals/payouts - Request a payout
export async function POST() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Get the primary assignment for this user
        const assignment = await prisma.referralAssignment.findFirst({
            where: { userId: session.user.id, status: "ACTIVE" },
            include: {
                profile: true,
                commissions: {
                    where: { status: "QUALIFIED" }
                }
            }
        });

        if (!assignment) {
            return NextResponse.json({ error: "No active referral program found" }, { status: 404 });
        }

        // 2. Calculate available amount
        const qualifiedCommissions = assignment.commissions;
        const totalAmount = qualifiedCommissions.reduce((sum, c) => sum + Number(c.totalAmount), 0);

        if (totalAmount <= 0) {
            return NextResponse.json({ error: "No hay fondos disponibles para retirar" }, { status: 400 });
        }

        // 3. Check against threshold
        const config = (assignment.configOverride as any) || (assignment.profile.config as any);
        const minThreshold = config?.payoutSettings?.minThreshold || 0;

        if (totalAmount < minThreshold) {
            return NextResponse.json({
                error: `El monto mínimo para retirar es de $${minThreshold}. Tu saldo actual es $${totalAmount}.`
            }, { status: 400 });
        }

        // 4. Create the payout request in a transaction
        const payout = await prisma.$transaction(async (tx) => {
            // Create the payout
            const newPayout = await tx.referralPayout.create({
                data: {
                    assignmentId: assignment.id,
                    amount: totalAmount,
                    method: assignment.payoutMethod,
                    status: "PENDING"
                }
            });

            // Link commissions to this payout and mark them as processing or keep as qualified but linked
            // We'll keep them as QUALIFIED but link them to the payout
            await tx.referralCommission.updateMany({
                where: {
                    id: { in: qualifiedCommissions.map(c => c.id) }
                },
                data: {
                    payoutId: newPayout.id
                }
            });

            return newPayout;
        });

        return NextResponse.json(payout);
    } catch (error) {
        console.error("Error requesting payout:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
