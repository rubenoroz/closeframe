"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, Settings, Users, DollarSign } from "lucide-react";

interface ReferralsLayoutProps {
    children: React.ReactNode;
}

export default function ReferralsLayout({ children }: ReferralsLayoutProps) {
    const pathname = usePathname();

    const tabs = [
        { href: "/superadmin/referrals", label: "Analytics", icon: BarChart3, exact: true },
        { href: "/superadmin/referrals/profiles", label: "Perfiles", icon: Settings },
        { href: "/superadmin/referrals/assignments", label: "Asignaciones", icon: Users },
        { href: "/superadmin/referrals/payouts", label: "Pagos", icon: DollarSign },
    ];

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-neutral-800">
                <nav className="flex gap-4">
                    {tabs.map((tab) => {
                        const isActive = tab.exact
                            ? pathname === tab.href
                            : pathname.startsWith(tab.href);
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                    isActive
                                        ? "border-violet-500 text-violet-400"
                                        : "border-transparent text-neutral-400 hover:text-white"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
