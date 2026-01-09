"use client";

import { useEffect, useState } from "react";
import {
    Users,
    FolderKanban,
    Cloud,
    CalendarCheck,
    TrendingUp,
    Crown,
    UserCheck,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
    totalUsers: number;
    activeUsers: number;
    totalProjects: number;
    totalCloudAccounts: number;
    totalBookings: number;
    usersByRole: {
        USER: number;
        ADMIN: number;
        SUPERADMIN: number;
    };
    usersByPlan: {
        planName: string;
        count: number;
    }[];
    recentUsers: {
        id: string;
        name: string | null;
        email: string;
        role: string;
        createdAt: string;
    }[];
}

export default function SuperadminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch("/api/superadmin/stats");
                if (!response.ok) {
                    throw new Error("Error al cargar estadísticas");
                }
                const data = await response.json();
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
                {error}
            </div>
        );
    }

    if (!stats) return null;

    const statCards = [
        {
            title: "Total Usuarios",
            value: stats.totalUsers,
            icon: <Users className="w-6 h-6" />,
            color: "bg-blue-500/20 text-blue-400"
        },
        {
            title: "Usuarios Activos",
            value: stats.activeUsers,
            subtitle: "Últimos 30 días",
            icon: <UserCheck className="w-6 h-6" />,
            color: "bg-green-500/20 text-green-400"
        },
        {
            title: "Proyectos",
            value: stats.totalProjects,
            icon: <FolderKanban className="w-6 h-6" />,
            color: "bg-violet-500/20 text-violet-400"
        },
        {
            title: "Nubes Conectadas",
            value: stats.totalCloudAccounts,
            icon: <Cloud className="w-6 h-6" />,
            color: "bg-cyan-500/20 text-cyan-400"
        },
        {
            title: "Reservas",
            value: stats.totalBookings,
            icon: <CalendarCheck className="w-6 h-6" />,
            color: "bg-amber-500/20 text-amber-400"
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-neutral-400 mt-1">
                    Vista general del sistema
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {statCards.map((card, index) => (
                    <div
                        key={index}
                        className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-all"
                    >
                        <div className={cn("p-3 rounded-xl inline-flex mb-4", card.color)}>
                            {card.icon}
                        </div>
                        <p className="text-3xl font-bold">{card.value.toLocaleString()}</p>
                        <p className="text-neutral-400 text-sm mt-1">{card.title}</p>
                        {card.subtitle && (
                            <p className="text-neutral-500 text-xs mt-0.5">{card.subtitle}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Usuarios por Rol */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Crown className="w-5 h-5 text-violet-400" />
                        Usuarios por Rol
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(stats.usersByRole).map(([role, count]) => {
                            const total = stats.totalUsers || 1;
                            const percentage = Math.round((count / total) * 100);

                            const roleColors: Record<string, string> = {
                                USER: "bg-blue-500",
                                ADMIN: "bg-amber-500",
                                SUPERADMIN: "bg-violet-500"
                            };

                            const roleLabels: Record<string, string> = {
                                USER: "Usuarios",
                                ADMIN: "Administradores",
                                SUPERADMIN: "Super Admins"
                            };

                            return (
                                <div key={role} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-300">{roleLabels[role]}</span>
                                        <span className="text-neutral-400">{count} ({percentage}%)</span>
                                    </div>
                                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all", roleColors[role])}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Usuarios por Plan */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        Usuarios por Plan
                    </h2>
                    {stats.usersByPlan.length === 0 ? (
                        <p className="text-neutral-500 text-sm">No hay planes configurados</p>
                    ) : (
                        <div className="space-y-3">
                            {stats.usersByPlan.map((plan, index) => {
                                const total = stats.totalUsers || 1;
                                const percentage = Math.round((plan.count / total) * 100);

                                const colors = [
                                    "bg-green-500",
                                    "bg-blue-500",
                                    "bg-violet-500",
                                    "bg-amber-500"
                                ];

                                return (
                                    <div key={index} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-300">{plan.planName}</span>
                                            <span className="text-neutral-400">{plan.count} ({percentage}%)</span>
                                        </div>
                                        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all", colors[index % colors.length])}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Users */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Usuarios Recientes</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-neutral-400 text-sm border-b border-neutral-800">
                                <th className="pb-3 font-medium">Usuario</th>
                                <th className="pb-3 font-medium">Email</th>
                                <th className="pb-3 font-medium">Rol</th>
                                <th className="pb-3 font-medium">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {stats.recentUsers.map((user) => (
                                <tr key={user.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                                    <td className="py-3">
                                        <span className="font-medium">{user.name || "Sin nombre"}</span>
                                    </td>
                                    <td className="py-3 text-neutral-400">{user.email}</td>
                                    <td className="py-3">
                                        <span className={cn(
                                            "px-2 py-1 rounded-md text-xs font-medium",
                                            user.role === "SUPERADMIN" && "bg-violet-500/20 text-violet-400",
                                            user.role === "ADMIN" && "bg-amber-500/20 text-amber-400",
                                            user.role === "USER" && "bg-blue-500/20 text-blue-400"
                                        )}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-3 text-neutral-400">
                                        {new Date(user.createdAt).toLocaleDateString("es-MX", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric"
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
