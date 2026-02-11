import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { syncBookingToCalendars, removeBookingFromCalendars } from "@/lib/calendar/sync";

// GET: List all bookings for the current user
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { plan: { select: { name: true } } }
        });

        const bookings = await prisma.booking.findMany({
            where: { userId: session.user.id },
            orderBy: { date: "asc" },
        });

        return NextResponse.json({ bookings, plan: user?.plan?.name });
    } catch (error) {
        console.error("GET Bookings Error FULL DETAILS:", error);
        return NextResponse.json({ error: "Failed to fetch bookings", details: String(error) }, { status: 500 });
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
        const { customerName, customerEmail, date, endDate, notes, status } = body;

        if (!customerName || !date) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const booking = await prisma.booking.create({
            data: {
                customerName,
                customerEmail,
                customerPhone: body.customerPhone || null,
                date: new Date(date),
                endDate: endDate ? new Date(endDate) : new Date(new Date(date).getTime() + 60 * 60 * 1000), // Default to 1h if not provided
                notes: notes || null,
                status: status || "pending",
                userId: session.user.id,
            },
        });

        // Sync to connected calendars (non-blocking)
        syncBookingToCalendars(session.user.id, {
            id: booking.id,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            date: booking.date,
            endDate: booking.endDate || new Date(booking.date.getTime() + 60 * 60 * 1000),
            notes: booking.notes,
            status: booking.status
        }).catch(err => console.error('Calendar sync error:', err));

        return NextResponse.json({ booking });
    } catch (error) {
        console.error("CREATE Booking Error:", error);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

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
            console.log(`[DELETE Booking] Booking ${id} not found or unauthorized`);
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Remove from external calendars first
        try {
            await removeBookingFromCalendars(session.user.id, id);
        } catch (syncError) {
            console.error(`[DELETE Booking] Sync removal failed (ignoring):`, syncError);
        }

        await prisma.booking.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE Booking Error:", error);
        return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
    }
}
// PATCH: Update an existing booking
export async function PATCH(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, customerName, customerEmail, date, endDate, notes, status, customerPhone } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
        }

        // Verify ownership and existence
        const existingBooking = await prisma.booking.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existingBooking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: {
                customerName,
                customerEmail,
                customerPhone: customerPhone || null,
                date: date ? new Date(date) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                notes: notes || null,
                status,
            },
        });

        // Sync to connected calendars (non-blocking)
        syncBookingToCalendars(session.user.id, {
            id: updatedBooking.id,
            customerName: updatedBooking.customerName,
            customerEmail: updatedBooking.customerEmail,
            date: updatedBooking.date,
            endDate: updatedBooking.endDate || new Date(updatedBooking.date.getTime() + 60 * 60 * 1000),
            notes: updatedBooking.notes,
            status: updatedBooking.status
        }).catch(err => console.error('Calendar sync error:', err));

        return NextResponse.json({ booking: updatedBooking });
    } catch (error) {
        console.error("UPDATE Booking Error:", error);
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }
}
