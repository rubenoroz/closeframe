import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(
    request: Request,
    props: { params: Promise<{ projectId: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projectId = params.projectId;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Count unread mentions
        const count = await (prisma as any).noteMention.count({
            where: {
                userId: user.id,
                isRead: false,
                note: {
                    projectId: projectId
                }
            }
        });

        return NextResponse.json({ count });

    } catch (error) {
        console.error("Error fetching unread count:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
