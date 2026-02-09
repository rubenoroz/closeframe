"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, Clock, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PayoutRequest {
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    requestedAt: string;
    processedAt: string | null;
    bankReference: string | null;
    failureReason: string | null;
    assignment: {
        referralCode: string;
        user: { name: string; email: string };
        profile: { name: string; type: string };
    };
}

export default function PayoutsPage() {
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchPayouts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/superadmin/referrals/payouts");
            if (res.ok) {
                const data = await res.json();
                setPayouts(data);
            }
        } catch (error) {
            console.error("Error fetching payouts:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayouts();
    }, [fetchPayouts]);

    const handleUpdateStatus = async (id: string, status: string) => {
        if (!confirm(`¿Estás seguro de marcar este pago como ${status}?`)) return;

        try {
            setProcessing(id);
            const res = await fetch("/api/superadmin/referrals/payouts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });

            if (res.ok) {
                fetchPayouts();
            }
        } catch (error) {
            console.error("Error updating payout:", error);
        } finally {
            setProcessing(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
            PENDING: "secondary",
            PROCESSING: "secondary",
            COMPLETED: "default",
            FAILED: "destructive"
        };
        const labels: Record<string, string> = {
            PENDING: "Pendiente",
            PROCESSING: "Procesando",
            COMPLETED: "Completado",
            FAILED: "Fallido"
        };
        return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
    };

    const filteredPayouts = payouts.filter(p =>
        p.assignment.user.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.assignment.user.email.toLowerCase().includes(search.toLowerCase()) ||
        p.assignment.referralCode.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Pagos</h1>
                    <p className="text-muted-foreground">
                        Revisa y aprueba las solicitudes de retiro de los afiliados
                    </p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o email..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Solicitudes de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredPayouts.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            {search ? "No se encontraron resultados para tu búsqueda." : "No hay solicitudes de pago registradas."}
                        </p>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">Fecha</th>
                                        <th className="px-4 py-3 text-left font-medium">Afiliado</th>
                                        <th className="px-4 py-3 text-center font-medium">Perfil</th>
                                        <th className="px-4 py-3 text-right font-medium">Monto</th>
                                        <th className="px-4 py-3 text-center font-medium">Estado</th>
                                        <th className="px-4 py-3 text-right font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {filteredPayouts.map((payout) => (
                                        <tr key={payout.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-muted-foreground">
                                                <div className="flex flex-col">
                                                    <span>{new Date(payout.requestedAt).toLocaleDateString("es-MX")}</span>
                                                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                                                        {new Date(payout.requestedAt).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{payout.assignment.user.name || "Usuario"}</span>
                                                    <span className="text-xs text-muted-foreground">{payout.assignment.user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                                    {payout.assignment.profile.name}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-lg font-bold text-green-400">
                                                    {formatCurrency(payout.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getStatusBadge(payout.status)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {payout.status === "PENDING" && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                            onClick={() => handleUpdateStatus(payout.id, "COMPLETED")}
                                                            disabled={!!processing}
                                                        >
                                                            {processing === payout.id ? (
                                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                    Pagado
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                                            onClick={() => handleUpdateStatus(payout.id, "FAILED")}
                                                            disabled={!!processing}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                                {payout.status === "COMPLETED" && (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        Procesado el {new Date(payout.processedAt!).toLocaleDateString("es-MX")}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
