import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// GET all projects for the current user
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const projects = await prisma.nodosProject.findMany({
            where: {
                ownerId: session.user.id,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return NextResponse.json(projects);
    } catch (error) {
        console.error("[NODOS_PROJECTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST create a new project
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { title, description, bookingId, externalEventId } = body;

        if (!title) {
            return new NextResponse("Missing project title", { status: 400 });
        }

        // Resolve external event to booking if needed
        let finalBookingId = bookingId;

        if (!finalBookingId && externalEventId) {
            const externalEvent = await prisma.externalCalendarEvent.findUnique({
                where: { id: externalEventId }
            });

            if (externalEvent) {
                if (externalEvent.linkedBookingId) {
                    finalBookingId = externalEvent.linkedBookingId;
                } else {
                    const newBooking = await prisma.booking.create({
                        data: {
                            userId: session.user.id,
                            customerName: externalEvent.title || "Evento Externo",
                            date: externalEvent.start,
                            endDate: externalEvent.end,
                            notes: externalEvent.description,
                            status: "confirmed",
                        }
                    });

                    await prisma.externalCalendarEvent.update({
                        where: { id: externalEventId },
                        data: { linkedBookingId: newBooking.id }
                    });

                    finalBookingId = newBooking.id;
                }
            }
        }

        // Pick a random pastel color for the first node
        const NODOS_COLORS = ['#ffcfea', '#d0dbff', '#fff7cf', '#ffd6d6', '#d4ffd6', '#e9d6ff'];
        const randomColor = NODOS_COLORS[Math.floor(Math.random() * NODOS_COLORS.length)];

        // Create with a default initial node
        const initialNodes = [
            {
                id: `node-${Date.now()}`,
                type: 'mindmap',
                position: { x: 250, y: 250 },
                data: {
                    label: title,
                    description: description || 'Idea central',
                    shape: 'card',
                    color: randomColor
                },
            }
        ];

        const project = await prisma.nodosProject.create({
            data: {
                title,
                description: description || null,
                nodes: initialNodes,
                edges: [],
                bookingId: finalBookingId || null,
                ownerId: session.user.id,
            },
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error("[NODOS_PROJECTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
