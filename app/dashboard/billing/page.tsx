import React from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            email: true,
            profileViews: true,
            plan: {
                select: { displayName: true }
            },
            role: true
        }
    });

    if (!user) {
        redirect("/login");
    }

    // Parallel data fetching for performance
    const [projectCount, cloudCount] = await Promise.all([
        prisma.project.count({
            where: { userId: userId }
        }),
        prisma.cloudAccount.count({
            where: { userId: userId }
        })
    ]);

    const planName = user.plan?.displayName || (user.role === 'SUPERADMIN' ? 'Super Admin' : 'Gratis');

    return (
        <BillingClient
            userName={user.name || "Usuario"}
            userEmail={user.email || ""}
            projectsCount={projectCount}
            cloudsCount={cloudCount}
            profileViews={user.profileViews}
            planName={planName}
        />
    );
}
