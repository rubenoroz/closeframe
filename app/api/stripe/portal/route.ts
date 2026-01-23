import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user || !user.stripeCustomerId) {
            return new NextResponse("User or stripe customer not found", { status: 404 });
        }

        const stripeSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
        });

        return NextResponse.json({ url: stripeSession.url });
    } catch (error: any) {
        console.error("[STRIPE_PORTAL]", error);
        return new NextResponse(error.message || "Internal Error", { status: 500 });
    }
}
