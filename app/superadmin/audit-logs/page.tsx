"use client";

import { useEffect, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, History, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
    id: string;
    userId: string;
    adminId: string;
    adminEmail: string | null;
    action: string;
    changes: any;
    previousValue: any;
    reason: string | null;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/superadmin/audit-logs?page=${pagination.page}&limit=${pagination.limit}`
            );
            const data = await response.json();

            if (data.logs) {
                setLogs(data.logs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [pagination.page]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("es-MX", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatChanges = (changes: any) => {
        const parts: string[] = [];

        if (changes?.features) {
            const features = Object.entries(changes.features)
                .filter(([_, v]) => v === true)
                .map(([k]) => k);
            if (features.length > 0) {
                parts.push(`Features: ${features.join(", ")}`);
            }
        }

        if (changes?.limits) {
            const limits = Object.entries(changes.limits)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => `${k}=${v}`);
            if (limits.length > 0) {
                parts.push(`Limits: ${limits.join(", ")}`);
            }
        }

        return parts.length > 0 ? parts.join(" | ") : "Sin cambios";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <History className="w-8 h-8 text-violet-500" />
                    Logs de Auditoría
                </h1>
                <p className="text-neutral-400 mt-1">
                    Historial de cambios en Feature Overrides
                </p>
            </div>

            {/* Logs Table */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
                        <History className="w-12 h-12 mb-4 opacity-30" />
                        <p>No hay logs de auditoría todavía</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-neutral-400 text-sm border-b border-neutral-800 bg-neutral-900/50">
                                        <th className="px-6 py-4 font-medium">Fecha</th>
                                        <th className="px-6 py-4 font-medium">Usuario Afectado</th>
                                        <th className="px-6 py-4 font-medium">Admin</th>
                                        <th className="px-6 py-4 font-medium">Acción</th>
                                        <th className="px-6 py-4 font-medium">Cambios</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {logs.map((log) => (
                                        <tr
                                            key={log.id}
                                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                            className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition cursor-pointer"
                                        >
                                            <td className="px-6 py-4 text-neutral-400">
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-neutral-500" />
                                                    <div>
                                                        <p className="font-medium">{log.user.name || "Sin nombre"}</p>
                                                        <p className="text-xs text-neutral-500">{log.user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-violet-500" />
                                                    <span className="text-violet-400">{log.adminEmail || "Unknown"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-medium",
                                                    log.action === "override_updated"
                                                        ? "bg-amber-500/20 text-amber-400"
                                                        : "bg-red-500/20 text-red-400"
                                                )}>
                                                    {log.action === "override_updated" ? "Actualizado" : "Limpiado"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400 max-w-xs truncate">
                                                {formatChanges(log.changes)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800">
                            <p className="text-sm text-neutral-400">
                                Mostrando {logs.length} de {pagination.total} logs
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page <= 1}
                                    className="p-2 hover:bg-neutral-800 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-neutral-400">
                                    Página {pagination.page} de {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-2 hover:bg-neutral-800 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Expanded Log Detail Modal */}
            {expandedLog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setExpandedLog(null)}>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-neutral-800">
                            <h2 className="text-lg font-semibold">Detalle del Log</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {(() => {
                                const log = logs.find(l => l.id === expandedLog);
                                if (!log) return null;
                                return (
                                    <>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Cambios Aplicados</p>
                                            <pre className="bg-neutral-800 p-4 rounded-xl text-xs overflow-x-auto">
                                                {JSON.stringify(log.changes, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Valor Anterior</p>
                                            <pre className="bg-neutral-800 p-4 rounded-xl text-xs overflow-x-auto">
                                                {JSON.stringify(log.previousValue, null, 2)}
                                            </pre>
                                        </div>
                                        {log.reason && (
                                            <div>
                                                <p className="text-xs text-neutral-500 mb-1">Razón</p>
                                                <p className="text-neutral-300">{log.reason}</p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
