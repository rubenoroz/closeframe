"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    TrendingUp,
    DollarSign,
    MousePointer,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    UserPlus,
    Target,
    Award
} from "lucide-react";

interface AnalyticsData {
    overview: {
        profiles: { total: number; active: number };
        assignments: { total: number; active: number };
        referrals: { total: number; converted: number };
        clicks: number;
        commissions: {
            pending: number;
            qualified: number;
            paid: number;
        };
    };
    thisMonth: {
        referrals: number;
        converted: number;
        clicks: number;
        commissions: number;
        growth: {
            referrals: number;
            conversions: number;
        };
    };
    conversionFunnel: {
        clicks: number;
        registered: number;
        converted: number;
        qualified: number;
        conversionRate: number;
    };
    topPerformers: Array<{
        id: string;
        referralCode: string;
        user: { name: string; email: string };
        profile: { name: string; type: string };
        totalReferrals: number;
        totalConverted: number;
        totalEarned: number;
    }>;
    recentActivity: Array<{
        id: string;
        referredEmail: string;
        status: string;
        createdAt: string;
        referrer: { name: string; email: string };
    }>;
    profileBreakdown: Array<{
        id: string;
        name: string;
        type: string;
        assignmentCount: number;
    }>;
}

export default function ReferralsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/superadmin/referrals/analytics");
            if (!res.ok) throw new Error("Failed to fetch analytics");
            const analytics = await res.json();
            setData(analytics);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={fetchAnalytics}>Reintentar</Button>
            </div>
        );
    }

    if (!data) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            CLICKED: "bg-gray-500",
            REGISTERED: "bg-blue-500",
            CONVERTED: "bg-green-500",
            QUALIFIED: "bg-purple-500",
            REFUNDED: "bg-red-500",
            FRAUDULENT: "bg-red-700"
        };
        return colors[status] || "bg-gray-500";
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Sistema de Referidos</h1>
                    <p className="text-muted-foreground">
                        Analytics y gestión del programa de referidos
                    </p>
                </div>
                <Button onClick={fetchAnalytics} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Referidos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.overview.referrals.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.overview.referrals.converted} convertidos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clics Totales</CardTitle>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.overview.clicks}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.thisMonth.clicks} este mes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comisiones Pendientes</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(data.overview.commissions.pending + data.overview.commissions.qualified)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(data.overview.commissions.paid)} pagadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.conversionFunnel.conversionRate}%</div>
                        <p className="text-xs text-muted-foreground">Últimos 30 días</p>
                    </CardContent>
                </Card>
            </div>

            {/* This Month Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Este Mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Nuevos Referidos</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{data.thisMonth.referrals}</span>
                                    {data.thisMonth.growth.referrals > 0 ? (
                                        <span className="text-green-500 text-sm flex items-center">
                                            <ArrowUpRight className="h-3 w-3" />
                                            {data.thisMonth.growth.referrals.toFixed(1)}%
                                        </span>
                                    ) : data.thisMonth.growth.referrals < 0 ? (
                                        <span className="text-red-500 text-sm flex items-center">
                                            <ArrowDownRight className="h-3 w-3" />
                                            {Math.abs(data.thisMonth.growth.referrals).toFixed(1)}%
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Conversiones</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{data.thisMonth.converted}</span>
                                    {data.thisMonth.growth.conversions > 0 ? (
                                        <span className="text-green-500 text-sm flex items-center">
                                            <ArrowUpRight className="h-3 w-3" />
                                            {data.thisMonth.growth.conversions.toFixed(1)}%
                                        </span>
                                    ) : data.thisMonth.growth.conversions < 0 ? (
                                        <span className="text-red-500 text-sm flex items-center">
                                            <ArrowDownRight className="h-3 w-3" />
                                            {Math.abs(data.thisMonth.growth.conversions).toFixed(1)}%
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Comisiones Generadas</span>
                                <span className="font-bold">{formatCurrency(data.thisMonth.commissions)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Funnel de Conversión (30 días)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Clics</span>
                                    <span>{data.conversionFunnel.clicks}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: "100%" }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Registrados</span>
                                    <span>{data.conversionFunnel.registered}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-500"
                                        style={{
                                            width: `${data.conversionFunnel.clicks > 0
                                                ? (data.conversionFunnel.registered / data.conversionFunnel.clicks) * 100
                                                : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Convertidos</span>
                                    <span>{data.conversionFunnel.converted}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500"
                                        style={{
                                            width: `${data.conversionFunnel.clicks > 0
                                                ? (data.conversionFunnel.converted / data.conversionFunnel.clicks) * 100
                                                : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Calificados</span>
                                    <span>{data.conversionFunnel.qualified}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500"
                                        style={{
                                            width: `${data.conversionFunnel.clicks > 0
                                                ? (data.conversionFunnel.qualified / data.conversionFunnel.clicks) * 100
                                                : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Performers & Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Top Referidores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.topPerformers.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                                Sin datos aún
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {data.topPerformers.slice(0, 5).map((performer, i) => (
                                    <div key={performer.id} className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                                {performer.user.name || performer.user.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {performer.totalConverted} convertidos · {formatCurrency(performer.totalEarned)}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {performer.referralCode}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Actividad Reciente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.recentActivity.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">
                                Sin actividad reciente
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {data.recentActivity.slice(0, 5).map((activity) => (
                                    <div key={activity.id} className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{activity.referredEmail}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Por {activity.referrer.name || activity.referrer.email}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {activity.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Profile Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Perfiles de Referido</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.profileBreakdown.map((profile) => (
                            <div
                                key={profile.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                            >
                                <div>
                                    <p className="font-medium">{profile.name}</p>
                                    <Badge variant={profile.type === "AFFILIATE" ? "default" : "secondary"}>
                                        {profile.type === "AFFILIATE" ? "Afiliado" : "Cliente"}
                                    </Badge>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{profile.assignmentCount}</p>
                                    <p className="text-xs text-muted-foreground">asignaciones</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
