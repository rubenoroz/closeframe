import { NextResponse } from "next/server";
import { processQualifiedCommissions } from "@/lib/services/referral.service";

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// GET /api/cron/process-commissions
export async function GET(request: Request) {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const processed = await processQualifiedCommissions();

        return NextResponse.json({
            success: true,
            processedCount: processed,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("[CRON] Error processing commissions:", error);
        return NextResponse.json(
            { error: "Failed to process commissions" },
            { status: 500 }
        );
    }
}

// Add to vercel.json:
// {
//   "crons": [
//     {
//       "path": "/api/cron/process-commissions",
//       "schedule": "0 */6 * * *"
//     }
//   ]
// }
