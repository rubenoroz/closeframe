import { NextResponse } from "next/server";
import { generateCsvTemplate } from "@/lib/scena/csv-parser";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const csvContent = generateCsvTemplate();

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename="plantilla_scena.csv"',
            },
        });
    } catch (error) {
        console.error("[SCENA_CSV_TEMPLATE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
