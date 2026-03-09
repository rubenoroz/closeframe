
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

        // Los usuarios free ahora pueden acceder al dashboard
        // con funcionalidades limitadas según su plan.
        // La restricción de invitación se eliminó para mejorar la UX.
    }, [session, status, router, pathname]);

    if (status === "loading") {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    // Si no hay sesión, no mostrar contenido (será redirigido al login)
    if (!session) return null;

    return <>{children}</>;
}
