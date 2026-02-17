"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Users,
    TrendingUp,
    DollarSign,
    MousePointer,
    RefreshCw,
    Copy,
    Check,
    Share2,
    ExternalLink,
    Gift
} from "lucide-react";

interface ReferralStats {
    assignments: Array<{
        id: string;
        referralCode: string;
        customSlug: string | null;
        status: string;
        profile: {
            name: string;
            type: string;
        };
        totalClicks: number;
        totalReferrals: number;
        totalConverted: number;
        totalEarned: string;
    }>;
    pendingCommissions: number;
    availableBalance: number;
    totalEarned: number;
    commissions: Array<{
        id: string;
        totalAmount: number;
        currency: string;
        status: string;
        qualifiesAt: string;
        createdAt: string;
        referral: {
            referredEmail: string;
        };
    }>;
    recentReferrals: Array<{
        id: string;
        referredEmail: string;
        status: string;
        createdAt: string;
    }>;
    batchProgress?: {
        activeReferrals: number;
        batchSize: number;
        currentProgress: number;
        nextRewardAt: number;
    } | null;
    limits?: {
        max: number;
        remaining: number;
        enabled: boolean;
    };
}

// ... rest of imports/component ...

const getCommissionStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        PENDING: "secondary",
        QUALIFIED: "default",
        PAID: "outline",
        CREDITED: "outline",
        CANCELLED: "destructive",
        ADJUSTED: "secondary"
    };
    const labels: Record<string, string> = {
        PENDING: "Pendiente",
        QUALIFIED: "Calificada",
        PAID: "Pagada",
        CREDITED: "Como Crédito",
        CANCELLED: "Cancelada",
        ADJUSTED: "Ajustada"
    };
    return (
        <Badge variant={variants[status] || "secondary"}>
            {labels[status] || status}
        </Badge>
    );
};

// ... inside return ...

export default function ReferralsPage() {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const [requesting, setRequesting] = useState(false);

    const fetchStats = useCallback(async () => {
        // ... (keep existing fetchStats logic)
        try {
            setLoading(true);
            const res = await fetch("/api/referrals/my");
            if (!res.ok) throw new Error("Error al cargar datos");
            const data = await res.json();

            if (data.hasProgram === false) {
                setStats(null);
                setLoading(false);
                return;
            }

            setStats(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleRequestPayout = async () => {
        if (!confirm("¿Deseas solicitar el pago de tu saldo disponible?")) return;

        try {
            setRequesting(true);
            const res = await fetch("/api/referrals/payouts", { method: "POST" });
            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Error al solicitar el pago");
                return;
            }

            alert("¡Solicitud enviada con éxito! El administrador revisará tu pago pronto.");
            fetchStats();
        } catch (err) {
            alert("Error de conexión al solicitar el pago");
        } finally {
            setRequesting(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const copyLink = async (code: string) => {
        const link = `${window.location.origin}/ref/${code}`;
        await navigator.clipboard.writeText(link);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const shareLink = async (code: string) => {
        const link = `${window.location.origin}/ref/${code}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "CloserLens - Sistema de Referidos",
                    text: "¡Únete a CloserLens con mi link de referido!",
                    url: link
                });
            } catch {
                copyLink(code);
            }
        } else {
            copyLink(code);
        }
    };

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(typeof amount === "string" ? parseFloat(amount) : amount);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            CLICKED: "bg-gray-500",
            REGISTERED: "bg-blue-500",
            CONVERTED: "bg-green-500",
            QUALIFIED: "bg-purple-500",
            REFUNDED: "bg-red-500"
        };
        return colors[status] || "bg-gray-500";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Card>
                    <CardContent className="py-12 text-center">
                        <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">
                            Programa de Referidos
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            {error ? "Ocurrió un error al cargar tus datos." : "Aún no tienes acceso al programa de referidos."}
                        </p>
                        <Button variant="outline" onClick={fetchStats}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {error ? "Reintentar" : "Actualizar"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const mainAssignment = stats.assignments[0];

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Mis Referidos</h1>
                    <p className="text-muted-foreground">
                        Comparte tu link y gana crédito para reducir tu factura o conseguir tu <strong>mensualidad GRATIS</strong>.
                    </p>
                </div>
                <Button onClick={fetchStats} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Limits Card */}
            {
                stats.limits && stats.limits.max !== -1 && (
                    <Card className="border-blue-500/50 bg-blue-500/10">
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-full">
                                    <Users className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-blue-100">Invitaciones Disponibles</p>
                                    <p className="text-sm text-blue-200/80">
                                        Te quedan <strong>{stats.limits.remaining}</strong> de <strong>{stats.limits.max}</strong> invitaciones.
                                    </p>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-blue-100">
                                {stats.limits.remaining}
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Batch Progress Card (New Feature) */}
            {
                stats.batchProgress && (
                    <Card className="border-primary/50 bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Gift className="h-5 w-5 text-primary" />
                                    Tu Próxima Recompensa
                                </CardTitle>
                                <Badge variant="outline" className="bg-background/50">
                                    {stats.batchProgress.activeReferrals} referidos activos
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Progreso del lote actual</span>
                                    <span className="font-bold">{stats.batchProgress.currentProgress} / {stats.batchProgress.batchSize}</span>
                                </div>
                                <div className="h-3 w-full bg-muted rounded-full overflow-hidden border">
                                    <div
                                        className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                        style={{ width: `${(stats.batchProgress.currentProgress / stats.batchProgress.batchSize) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Te faltan <strong className="text-foreground">{stats.batchProgress.nextRewardAt} referidos</strong> con suscripción activa para obtener tu siguiente crédito automático.
                            </p>
                        </CardContent>
                    </Card>
                )
            }

            {/* Referral Link Card */}
            <Card className="border-violet-500/50 bg-gradient-to-r from-violet-500/10 to-purple-500/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-violet-500" />
                        Tu Link de Referido
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {stats.assignments.map((assignment) => (
                        <div key={assignment.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant={assignment.profile.type === "AFFILIATE" ? "default" : "secondary"}>
                                    {assignment.profile.name}
                                </Badge>
                                {assignment.status !== "ACTIVE" && (
                                    <Badge variant="destructive">{assignment.status}</Badge>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/ref/${assignment.customSlug || assignment.referralCode}`}
                                    className="font-mono text-sm"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => copyLink(assignment.customSlug || assignment.referralCode)}
                                >
                                    {copiedCode === (assignment.customSlug || assignment.referralCode) ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    onClick={() => shareLink(assignment.customSlug || assignment.referralCode)}
                                >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Compartir
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clics</CardTitle>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mainAssignment.totalClicks}</div>
                        <p className="text-xs text-muted-foreground">visitantes únicos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Referidos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mainAssignment.totalReferrals}</div>
                        <p className="text-xs text-muted-foreground">
                            {mainAssignment.totalConverted} convertidos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.availableBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">disponible para retiro</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Ganado</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.totalEarned)}
                        </div>
                        <p className="text-xs text-muted-foreground">historial completo</p>
                    </CardContent>
                </Card>
            </div>

            {/* Pending & Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Pending Commissions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Comisiones Pendientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-violet-500 mb-2">
                            {formatCurrency(stats.pendingCommissions)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Las comisiones se califican después del periodo de gracia (30 días).
                        </p>
                        {stats.availableBalance > 0 && (
                            <Button
                                className="mt-4 w-full"
                                variant="default"
                                onClick={handleRequestPayout}
                                disabled={requesting}
                            >
                                {requesting ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    "Solicitar Pago"
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Referrals */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(!stats.recentReferrals || stats.recentReferrals.length === 0) ? (
                            <p className="text-muted-foreground text-center py-4">
                                Sin referidos aún. ¡Comparte tu link!
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentReferrals.slice(0, 5).map((referral) => (
                                    <div key={referral.id} className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(referral.status)}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{referral.referredEmail}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(referral.createdAt).toLocaleDateString("es-MX", {
                                                    day: "numeric",
                                                    month: "short"
                                                })}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {referral.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Commission History Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Historial de Comisiones</CardTitle>
                </CardHeader>
                <CardContent>
                    {(!stats.commissions || stats.commissions.length === 0) ? (
                        <p className="text-muted-foreground text-center py-4">
                            No hay comisiones registradas aún.
                        </p>
                    ) : (
                        <div className="rounded-md border overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">Fecha</th>
                                        <th className="px-4 py-3 text-left font-medium">Referido</th>
                                        <th className="px-4 py-3 text-right font-medium">Monto</th>
                                        <th className="px-4 py-3 text-center font-medium">Estado</th>
                                        <th className="px-4 py-3 text-left font-medium">Liberación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stats.commissions.map((commission) => (
                                        <tr key={commission.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                {new Date(commission.createdAt).toLocaleDateString("es-MX")}
                                            </td>
                                            <td className="px-4 py-3 font-medium truncate max-w-[150px]">
                                                {commission.referral.referredEmail.replace(/(.{3}).+(@.+)/, "$1...$2")}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold">
                                                {formatCurrency(commission.totalAmount)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getCommissionStatusBadge(commission.status)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {commission.status === "PENDING"
                                                    ? new Date(commission.qualifiesAt).toLocaleDateString("es-MX")
                                                    : (commission.status === "QUALIFIED" || commission.status === "PAID" || commission.status === "CREDITED")
                                                        ? "Liberada"
                                                        : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Conversion Tips */}
            <Card className="bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        💡 Tips para Más Conversiones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="p-4 bg-background/50 rounded-lg">
                            <h4 className="font-medium mb-1">Redes Sociales</h4>
                            <p className="text-sm text-muted-foreground">
                                Comparte tu experiencia con CloserLens en Instagram o Facebook
                            </p>
                        </div>
                        <div className="p-4 bg-background/50 rounded-lg">
                            <h4 className="font-medium mb-1">Email Personal</h4>
                            <p className="text-sm text-muted-foreground">
                                Envía tu link a colegas fotógrafos que conoces
                            </p>
                        </div>
                        <div className="p-4 bg-background/50 rounded-lg">
                            <h4 className="font-medium mb-1">Grupos y Comunidades</h4>
                            <p className="text-sm text-muted-foreground">
                                Comparte en grupos de fotografía donde participas
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
