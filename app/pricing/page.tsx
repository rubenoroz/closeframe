import React from "react";
import { prisma } from "@/lib/db";
import PricingClient from "./PricingClient";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
    const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
    });

    return <PricingClient plans={plans} />;
}
