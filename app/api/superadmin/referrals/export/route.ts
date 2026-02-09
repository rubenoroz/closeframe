import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/superadmin/referrals/export - Export referrals data as CSV
export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.role || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "referrals"; // referrals, assignments, commissions

    try {
        let csvContent = "";
        let filename = "";

        if (type === "referrals") {
            const referrals = await prisma.referral.findMany({
                include: {
                    assignment: {
                        include: {
                            user: { select: { name: true, email: true } },
                            profile: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            });

            csvContent = "ID,Email Referido,Estado,Referidor,Email Referidor,Perfil,Fecha Creación,Fecha Conversión,Fecha Calificación\n";
            referrals.forEach((r: any) => {
                csvContent += `"${r.id}","${r.referredEmail}","${r.status}","${r.assignment.user.name || ""}","${r.assignment.user.email}","${r.assignment.profile.name}","${r.createdAt.toISOString()}","${r.convertedAt?.toISOString() || ""}","${r.qualifiedAt?.toISOString() || ""}"\n`;
            });
            filename = `referidos_${new Date().toISOString().split("T")[0]}.csv`;

        } else if (type === "assignments") {
            const assignments = await prisma.referralAssignment.findMany({
                include: {
                    user: { select: { name: true, email: true } },
                    profile: { select: { name: true, type: true } }
                },
                orderBy: { createdAt: "desc" }
            });

            csvContent = "ID,Código,Slug,Usuario,Email,Perfil,Tipo,Estado,Clics,Referidos,Convertidos,Ganancias,Fecha Creación\n";
            assignments.forEach((a: any) => {
                csvContent += `"${a.id}","${a.referralCode}","${a.customSlug || ""}","${a.user.name || ""}","${a.user.email}","${a.profile.name}","${a.profile.type}","${a.status}",${a.totalClicks},${a.totalReferrals},${a.totalConverted},${a.totalEarned},"${a.createdAt.toISOString()}"\n`;
            });
            filename = `asignaciones_${new Date().toISOString().split("T")[0]}.csv`;

        } else if (type === "commissions") {
            const commissions = await prisma.referralCommission.findMany({
                include: {
                    referral: {
                        include: {
                            assignment: {
                                include: {
                                    user: { select: { name: true, email: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            });

            csvContent = "ID,Referidor,Email Referidor,Monto Total,Monto Comisión,Moneda,Estado,Stripe Payment ID,Fecha Creación,Fecha Calificación\n";
            commissions.forEach((c: any) => {
                csvContent += `"${c.id}","${c.referral.assignment.user.name || ""}","${c.referral.assignment.user.email}",${c.totalAmount},${c.commissionAmount},"${c.currency}","${c.status}","${c.stripePaymentIntentId || ""}","${c.createdAt.toISOString()}","${c.qualifiedAt?.toISOString() || ""}"\n`;
            });
            filename = `comisiones_${new Date().toISOString().split("T")[0]}.csv`;
        }

        // Add BOM for Excel UTF-8 compatibility
        const bom = "\uFEFF";
        const csvWithBom = bom + csvContent;

        return new NextResponse(csvWithBom, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("[REFERRAL] Error exporting CSV:", error);
        return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
}
