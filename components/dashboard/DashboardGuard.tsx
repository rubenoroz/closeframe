
"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface DashboardGuardProps {
    children: ReactNode;
}

export function DashboardGuard({ children }: DashboardGuardProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
            return;
        }

        const user = session.user as any;
        const isFree = !user.planName || user.planName.toLowerCase() === "free";
        const isAdmin = ["SUPERADMIN", "STAFF", "VIP"].includes(user.role);

        // RESTRICTION LOGIC:
        // If user is FREE (or no plan) AND NOT invited AND NOT an admin
        // Then they must go to pricing to pay or get an invite.
        if (isFree && !user.isInvited && !isAdmin) {
            console.log("[DASHBOARD_GUARD] Access denied for non-invited free user. Redirecting to billing.");
            router.push("/pricing?reason=invite_required");
        }
    }, [session, status, router, pathname]);

    if (status === "loading") {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    // Double check session to avoid flicker before redirect
    if (!session) return null;

    const user = session.user as any;
    const isFree = !user.planName || user.planName.toLowerCase() === "free";
    const isAdmin = ["SUPERADMIN", "STAFF", "VIP"].includes(user.role);

    // If they are going to be redirected, don't show children
    if (isFree && !user.isInvited && !isAdmin) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    return <>{children}</>;
}
