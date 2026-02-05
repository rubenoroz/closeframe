
"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
});

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("Starting Emergency Bypass...");

        // 1. Create a Custom Account (allows API verification)
        // In test mode, we can use 'standard' but we can't verify it via API.
        // 'express' or 'custom' allows us to accept TOS via API in test mode easily?
        // Actually, for 'standard', we can't accept TOS. 
        // We will make it 'express' to simulate a managed flow, or 'custom'.
        // Let's try 'express' as it's a middle ground, but 'custom' is safest for full API control.
        // Wait, standard is what the app expects. But Custom works for checkout.

        const account = await stripe.accounts.create({
            type: "custom",
            country: "MX",
            email: `test_bypass_${Date.now()}@example.com`,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: "individual",
            business_profile: {
                name: "Closerlens Test Photographer",
                url: "https://closerlens.com",
                mcc: "7221", // Photography
                product_description: "Photography services",
            },
            individual: {
                first_name: "Test",
                last_name: "Photographer",
                email: `test_bypass_${Date.now()}@example.com`,
                phone: "+523312345678",
                dob: { day: 1, month: 1, year: 1990 },
                address: {
                    line1: "Av. Vallarta 123",
                    city: "Guadalajara",
                    state: "Jalisco",
                    postal_code: "44100",
                    country: "MX",
                },
                id_number: "XAXX010101000", // Generic RFC for testing
            },
            tos_acceptance: {
                date: Math.floor(Date.now() / 1000),
                ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
            },
        });

        console.log("Created Account:", account.id);

        // 2. Save to Database
        await prisma.stripeConnectAccount.upsert({
            where: { userId: session.user.id },
            update: {
                stripeAccountId: account.id,
                chargesEnabled: true, // Force true locally
                payoutsEnabled: true,
                updatedAt: new Date(),
            },
            create: {
                userId: session.user.id,
                stripeAccountId: account.id,
                chargesEnabled: true,
                payoutsEnabled: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Emergency Bypass Successful. Account Created & Linked.",
            account_id: account.id,
            type: account.type
        });

    } catch (error: any) {
        console.error("Bypass Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
