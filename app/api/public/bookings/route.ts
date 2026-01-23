import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, customerName, customerEmail, date, notes } = body;

        if (!userId || !customerName || !customerEmail || !date) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true } // Simple check
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const booking = await prisma.booking.create({
            data: {
                userId,
                customerName,
                customerEmail,
                customerPhone: body.customerPhone,
                date: new Date(date),
                notes: notes || "Booking via Profile CTA",
                status: "pending"
            }
        });

        return NextResponse.json({ success: true, booking });
    } catch (error) {
        console.error("PUBLIC BOOKING ERROR:", error);
        return NextResponse.json({ error: `Server error: ${(error as any).message}` }, { status: 500 });
    }
}
