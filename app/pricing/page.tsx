import React from "react";
import { prisma } from "@/lib/db";
import PricingClient from "./PricingClient";
import { headers } from "next/headers";
import { getRegionFromHeaders } from "@/lib/geo";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
    const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
    });

    const headersList = await headers();
    const region = getRegionFromHeaders(headersList);

    return <PricingClient plans={plans} region={region} />;
}
