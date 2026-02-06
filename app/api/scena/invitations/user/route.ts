
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const prismaAny = prisma as any;

        const invitations = await prismaAny.projectInvitation.findMany({
            where: {
                email: session.user.email,
                status: "PENDING"
            },
            include: {
                project: {
                    select: {
                        name: true,
                        owner: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                sender: {
                    select: {
                        name: true,
                        image: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(invitations);
    } catch (error) {
        console.error("[SCENA_USER_INVITATIONS]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
