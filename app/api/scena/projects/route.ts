import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { canUseFeature, getFeatureLimit } from "@/lib/features/service";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const archived = searchParams.get("archived") === "true";

        const projects = await prisma.scenaProject.findMany({
            where: {
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } }
                ],
                isArchived: archived,
            },
            include: {
                members: {
                    include: { user: true }
                },
                notes: {
                    where: {
                        mentions: {
                            some: {
                                userId: session.user.id,
                                isRead: false
                            }
                        }
                    },
                    select: {
                        id: true // minimal select just to count
                    }
                },
                booking: {
                    select: {
                        id: true,
                        customerName: true,
                        date: true,
                        notes: true
                    }
                },
                columns: {
                    include: {
                        tasks: true
                    }
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return NextResponse.json(projects);
    } catch (error) {
        console.error("[SCENA_PROJECTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { name, description, bookingId, externalEventId } = body;

        if (!name) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // 1. Check Access
        const hasAccess = await canUseFeature(session.user.id, 'scenaAccess');
        if (!hasAccess) {
            return NextResponse.json({ error: "Your plan does not have access to Scena Projects." }, { status: 403 });
        }

        // 2. Check Limits
        const limit = await getFeatureLimit(session.user.id, 'maxScenaProjects');
        if (limit !== null && limit !== -1) {
            const count = await prisma.scenaProject.count({
                where: { ownerId: session.user.id }
            });

            if (count >= limit) {
                return NextResponse.json({
                    error: `You have reached the limit of ${limit} projects for your plan.`
                }, { status: 403 });
            }
        }

        // 3. Determine Booking ID
        let finalBookingId = bookingId;

        // If no direct bookingId provided but externalEventId is, we need to resolve it
        if (!finalBookingId && externalEventId) {
            const externalEvent = await prisma.externalCalendarEvent.findUnique({
                where: { id: externalEventId }
            });

            if (externalEvent) {
                // If already linked, use the existing booking
                if (externalEvent.linkedBookingId) {
                    finalBookingId = externalEvent.linkedBookingId;
                } else {
                    // Create a new local booking mirroring the external event
                    const newBooking = await prisma.booking.create({
                        data: {
                            userId: session.user.id,
                            customerName: externalEvent.title || "Evento Externo",
                            date: externalEvent.start,
                            endDate: externalEvent.end,
                            notes: externalEvent.description,
                            status: "confirmed", // External events effectively occupy the slot
                        }
                    });

                    // Link the External Event to this new Booking
                    await prisma.externalCalendarEvent.update({
                        where: { id: externalEventId },
                        data: { linkedBookingId: newBooking.id }
                    });

                    finalBookingId = newBooking.id;
                }
            }
        }

        const project = await prisma.scenaProject.create({
            data: {
                name,
                description,
                bookingId: finalBookingId || null,
                ownerId: session.user.id,
                columns: {
                    createMany: {
                        data: [
                            { name: "Por hacer", order: 0 },
                            { name: "En progreso", order: 1 },
                            { name: "Listo", order: 2 },
                        ]
                    }
                }
            },
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error("[SCENA_PROJECTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
