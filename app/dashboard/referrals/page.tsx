"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function ReferralsPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirigir a la pestaña de referidos dentro de Billing
        router.replace("/dashboard/billing?tab=referrals");
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-neutral-500" />
            <p className="text-neutral-500 animate-pulse">Redirigiendo a Suscripción...</p>
        </div>
    );
}
