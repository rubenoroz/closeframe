import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            cloudAccounts: { include: { projects: true } },
            oauthAccounts: true
        }
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Filter out secrets from video accounts
    const videoAccounts = user.oauthAccounts.map(acc => ({
        id: acc.id,
        provider: acc.provider,
        providerAccountId: acc.providerAccountId,
        createdAt: acc.createdAt,
        name: acc.name,
        image: acc.image
        // Don't leak tokens
    }));

    return NextResponse.json({
        storage: user.cloudAccounts,
        video: videoAccounts
    });
}

export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, name } = body;

        console.log("PATCH REQUEST RECEIVED:", { id, name });

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        // Verify ownership
        const account = await prisma.cloudAccount.findUnique({
            where: { id }
        });

        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        if (account.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Re-verify strictly before write
        if (account.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden: Ownership mismatch" }, { status: 403 });
        }

        console.log("UPDATING PRISMA...");
        const updated = await prisma.cloudAccount.update({
            where: { id },
            data: { name }
        });
        console.log("UPDATE SUCCESSFUL!");

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("PATCH FATAL ERROR:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const type = searchParams.get("type"); // "storage" | "video"

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        if (type === "video") {
            const account = await prisma.oAuthAccount.findUnique({ where: { id } });
            if (!account || account.userId !== session.user.id) {
                return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
            }
            await prisma.oAuthAccount.delete({ where: { id } });
        } else {
            // Default to cloudAccount for backward compat or explicit type
            const account = await prisma.cloudAccount.findUnique({ where: { id } });
            if (!account || account.userId !== session.user.id) {
                return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
            }
            await prisma.cloudAccount.delete({ where: { id } });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
