"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Camera, LayoutGrid, Plus, Settings, LogOut, CalendarDays, ChevronDown, User, Monitor, CreditCard, Menu, X, Sun, Moon, Shield } from "lucide-react";
import Image from "next/image";
import { ScenaIcon } from "@/components/icons/ScenaIcon";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { theme, toggleTheme } = useTheme();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const userPlan = ((session?.user as any)?.planName || '').toLowerCase();
    const userRole = (session?.user as any)?.role;
    const showScena = ['studio', 'agency'].includes(userPlan) || userRole === 'SUPERADMIN' || userRole === 'ADMIN';

    const navItems = [
        { href: "/dashboard/settings", label: "Perfil público", icon: <User className="w-5 h-5" /> },
        { href: "/dashboard", label: "Mis Galerías", icon: <LayoutGrid className="w-5 h-5" /> },
        { href: "/dashboard/bookings", label: "Mi Agenda", icon: <CalendarDays className="w-5 h-5" /> },
        // Conditional Scena Link
        ...(showScena
            ? [{ href: "/dashboard/scena", label: "Scena", icon: <ScenaIcon className="w-5 h-5" /> }]
            : []),
        { href: "/dashboard/clouds", label: "Nubes conectadas", icon: <Settings className="w-5 h-5" /> },
        { href: "/dashboard/billing", label: "Cuentas y pagos", icon: <CreditCard className="w-5 h-5" /> },
        // Conditional Superadmin Link
        ...(userRole === 'SUPERADMIN'
            ? [{ href: "/superadmin", label: "Superadmin", icon: <Shield className="w-5 h-5" /> }]
            : []),
    ];

    return (
        <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300">
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-800 flex items-center justify-between px-4 z-30 md:hidden">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg hover:bg-neutral-800 transition text-white"
                >
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div className="relative w-32 h-8">
                    <Image
                        src="/logo-white.svg"
                        alt="CloserLens"
                        fill
                        className="object-contain object-center"
                        priority
                    />
                </div>
                <div className="w-9" /> {/* Spacer for centering */}
            </header>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "w-64 border-r border-neutral-800 flex flex-col fixed inset-y-0 left-0 bg-neutral-900/95 backdrop-blur-xl z-30 transition-transform duration-300",
                "md:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-neutral-800">
                    <div className="relative w-40 h-8">
                        <Image
                            src="/logo-white.svg"
                            alt="CloserLens"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-white text-black font-medium"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                )}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-neutral-800">
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-800 transition group text-white"
                        >
                            {session?.user?.image ? (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || "Avatar"}
                                    className="w-9 h-9 rounded-full border-2 border-neutral-700 group-hover:border-neutral-500 transition"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center">
                                    <User className="w-5 h-5 text-neutral-400" />
                                </div>
                            )}
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium truncate max-w-[120px]">
                                    {session?.user?.name || "Usuario"}
                                </p>
                                <p className="text-xs text-neutral-500 truncate max-w-[120px]">
                                    {session?.user?.email}
                                </p>
                            </div>
                            <ChevronDown className={cn(
                                "w-4 h-4 text-neutral-500 transition-transform",
                                showUserMenu && "rotate-180"
                            )} />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl z-50">
                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:text-white hover:bg-neutral-800 transition border-b border-neutral-800"
                                >
                                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    <span className="text-sm">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                                </button>

                                <button
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-neutral-800 transition"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm">Cerrar sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pt-14 md:pt-0 p-4 md:p-8 lg:p-12 overflow-y-auto min-h-screen">
                {children}
            </main>
        </div>
    );
}

