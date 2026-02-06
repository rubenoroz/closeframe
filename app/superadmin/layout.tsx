"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Shield,
    Users,
    CreditCard,
    BarChart3,
    Settings,
    ChevronLeft,
    Loader2,
    History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface SuperadminLayoutProps {
    children: React.ReactNode;
}

export default function SuperadminLayout({ children }: SuperadminLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();

    // Verificar rol de superadmin
    const userRole = (session?.user as { role?: string })?.role;
    const isSuperAdmin = userRole === "SUPERADMIN";

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            router.push("/login");
            return;
        }

        if (!isSuperAdmin) {
            router.push("/dashboard");
        }
    }, [session, status, isSuperAdmin, router]);

    // Mostrar loading mientras verifica
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    // No mostrar nada si no es superadmin
    if (!isSuperAdmin) {
        return null;
    }

    const navItems = [
        {
            href: "/superadmin",
            label: "Dashboard",
            icon: <BarChart3 className="w-5 h-5" />,
            exact: true
        },
        {
            href: "/superadmin/users",
            label: "Usuarios",
            icon: <Users className="w-5 h-5" />
        },
        {
            href: "/superadmin/plans",
            label: "Planes",
            icon: <CreditCard className="w-5 h-5" />
        },
        {
            href: "/superadmin/features",
            label: "Features (Matriz)",
            icon: <Shield className="w-5 h-5" />
        },
        {
            href: "/superadmin/audit-logs",
            label: "Auditoría",
            icon: <History className="w-5 h-5" />
        },
        {
            href: "/superadmin/settings",
            label: "Configuración",
            icon: <Settings className="w-5 h-5" />
        },
    ];

    return (
        <div className="flex min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-neutral-800 flex flex-col fixed inset-y-0 left-0 bg-neutral-900/50 backdrop-blur-xl z-20">
                {/* Header */}
                <div className="p-6 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-violet-600/20 rounded-lg">
                            <Shield className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <span className="font-medium text-lg">Super Admin</span>
                            <p className="text-xs text-neutral-500">Panel de Control</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-violet-600 text-white font-medium"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                )}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer - Volver al dashboard */}
                <div className="p-4 border-t border-neutral-800">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-3 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Volver al Dashboard</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 md:p-12 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
