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

        const { planId, priceId } = await req.json();

        if (!planId || !priceId) {
            return new NextResponse("Missing planId or priceId", { status: 400 });
        }

        // Get user details
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Identify or create Stripe Customer
        let customerId = user.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name || undefined,
                metadata: {
                    userId: user.id,
                },
            });
            customerId = customer.id;

            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId },
            });
        }

        // Create Checkout Session
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
            metadata: {
                userId: user.id,
                planId: planId,
            },
            allow_promotion_codes: true,
            billing_address_collection: "auto",
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error: any) {
        console.error("[STRIPE_CHECKOUT]", error);
        return new NextResponse(error.message || "Internal Error", { status: 500 });
    }
}
