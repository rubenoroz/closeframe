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
    History,
    Menu,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface SuperadminLayoutProps {
    children: React.ReactNode;
}

export default function SuperadminLayout({ children }: SuperadminLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Verificar rol de superadmin
    const userRole = (session?.user as { role?: string })?.role;
    const isSuperAdmin = userRole === "SUPERADMIN";
    const isStaff = userRole === "STAFF";
    const isAdmin = isSuperAdmin || isStaff;

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            router.push("/login");
            return;
        }

        if (!isAdmin) {
            router.push("/dashboard");
        }
    }, [session, status, isAdmin, router]);

    // Close mobile menu on navigation
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    // Mostrar loading mientras verifica
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    // No mostrar nada si no es superadmin
    if (!isAdmin) {
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
        ...(isSuperAdmin ? [{
            href: "/superadmin/plans",
            label: "Planes",
            icon: <CreditCard className="w-5 h-5" />
        }] : []),
        ...(isSuperAdmin ? [{
            href: "/superadmin/referrals",
            label: "Referidos",
            icon: <Users className="w-5 h-5" />
        }] : []),
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
        ...(isSuperAdmin ? [{
            href: "/superadmin/settings",
            label: "Configuración",
            icon: <Settings className="w-5 h-5" />
        }] : []),
    ];

    const sidebarContent = (
        <>
            {/* Header */}
            <div className="p-6 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-600/20 rounded-lg">
                        <Shield className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <span className="font-medium text-lg">{isStaff ? "Staff" : "Super Admin"}</span>
                        <p className="text-xs text-neutral-500">{isStaff ? "Acceso Limitado" : "Panel de Control"}</p>
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
        </>
    );

    return (
        <div className="flex min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            {/* Mobile Header */}
            <div className="fixed top-0 left-0 right-0 z-30 md:hidden bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-violet-600/20 rounded-lg">
                            <Shield className="w-4 h-4 text-violet-400" />
                        </div>
                        <span className="font-medium text-sm">{isStaff ? "Staff" : "Admin"}</span>
                    </div>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
                        aria-label="Menú"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
                    mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar — Desktop: static, Mobile: animated drawer */}
            <aside
                className={cn(
                    "w-64 border-r border-neutral-800 flex flex-col bg-neutral-900/95 backdrop-blur-xl z-50",
                    // Desktop
                    "hidden md:flex fixed inset-y-0 left-0",
                    // Mobile drawer — shown via separate element
                )}
            >
                {sidebarContent}
            </aside>

            {/* Mobile Drawer */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 w-72 border-r border-neutral-800 flex flex-col bg-neutral-900/95 backdrop-blur-xl z-50",
                    "md:hidden transition-transform duration-300 ease-out",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Close button inside drawer */}
                <div className="absolute top-3 right-3">
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {sidebarContent}
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-0 md:ml-64 pt-14 md:pt-0 p-4 md:p-12 overflow-y-auto min-h-screen">
                {children}
            </main>
        </div>
    );
}
