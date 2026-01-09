import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

// GET: List all bookings for the current user
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const bookings = await prisma.booking.findMany({
            where: { userId: session.user.id },
            orderBy: { date: "asc" },
        });

        return NextResponse.json({ bookings });
    } catch (error) {
        console.error("GET Bookings Error:", error);
        return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }
}

// POST: Create a new booking
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { customerName, customerEmail, date, notes, status } = body;

        if (!customerName || !customerEmail || !date) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const booking = await prisma.booking.create({
            data: {
                customerName,
                customerEmail,
                date: new Date(date),
                notes: notes || null,
                status: status || "pending",
                userId: session.user.id,
            },
        });

        return NextResponse.json({ booking });
    } catch (error) {
        console.error("CREATE Booking Error:", error);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
}

// DELETE: Remove a booking
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
        }

        // Verify ownership
        const booking = await prisma.booking.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        await prisma.booking.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE Booking Error:", error);
        return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
    }
}
