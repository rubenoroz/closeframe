"use client";

import { useEffect, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, History, User, Shield, Activity, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
    id: string;
    _type: "override" | "action";
    // Override fields
    userId?: string;
    adminId: string;
    adminEmail: string | null;
    action: string;
    changes?: any;
    previousValue?: any;
    reason?: string | null;
    createdAt: string;
    user?: {
        name: string | null;
        email: string;
    };
    // Action fields
    adminRole?: string | null;
    resourceType?: string;
    resourceId?: string | null;
    details?: any;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
    "override_updated": "Override Actualizado",
    "override_cleared": "Override Limpiado",
    "USER_OVERRIDE_UPDATE": "Permisos Actualizados",
    "USER_ROLE_UPDATE": "Rol Cambiado",
    "USER_PLAN_UPDATE": "Plan Cambiado",
    "USER_DELETE": "Usuario Eliminado",
    "FEATURE_MATRIX_UPDATE": "Matriz Actualizada",
};

const ACTION_COLORS: Record<string, string> = {
    "override_updated": "bg-amber-500/20 text-amber-400",
    "override_cleared": "bg-red-500/20 text-red-400",
    "USER_OVERRIDE_UPDATE": "bg-amber-500/20 text-amber-400",
    "USER_ROLE_UPDATE": "bg-violet-500/20 text-violet-400",
    "USER_PLAN_UPDATE": "bg-blue-500/20 text-blue-400",
    "USER_DELETE": "bg-red-500/20 text-red-400",
    "FEATURE_MATRIX_UPDATE": "bg-teal-500/20 text-teal-400",
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 30,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"all" | "overrides" | "actions">("all");

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/superadmin/audit-logs?page=${pagination.page}&limit=${pagination.limit}&type=${activeTab}`
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
    }, [pagination.page, activeTab]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("es-MX", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatChanges = (log: AuditLog) => {
        if (log._type === "override") {
            const changes = log.changes;
            const parts: string[] = [];
            if (changes?.features) {
                const features = Object.entries(changes.features)
                    .filter(([_, v]) => v === true)
                    .map(([k]) => k);
                if (features.length > 0) parts.push(`Features: ${features.join(", ")}`);
            }
            if (changes?.limits) {
                const limits = Object.entries(changes.limits)
                    .filter(([_, v]) => v !== undefined)
                    .map(([k, v]) => `${k}=${v}`);
                if (limits.length > 0) parts.push(`Limits: ${limits.join(", ")}`);
            }
            return parts.length > 0 ? parts.join(" | ") : "Sin cambios";
        }

        // Action type
        if (log.details) {
            if (log.action === "USER_DELETE" && log.details.deletedUser) {
                return `${log.details.deletedUser.email || "N/A"}`;
            }
            if (log.action === "USER_ROLE_UPDATE" && log.details.role) {
                return `→ ${log.details.role.to}`;
            }
            if (log.action === "FEATURE_MATRIX_UPDATE") {
                return `enabled=${log.details.enabled}, limit=${log.details.limit ?? "N/A"}`;
            }
            return JSON.stringify(log.details).substring(0, 80);
        }
        return "—";
    };

    const getTargetInfo = (log: AuditLog) => {
        if (log._type === "override" && log.user) {
            return { name: log.user.name || "Sin nombre", detail: log.user.email };
        }
        if (log._type === "action") {
            return { name: log.resourceType || "—", detail: log.resourceId?.substring(0, 12) || "—" };
        }
        return { name: "—", detail: "—" };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                    <History className="w-6 h-6 md:w-8 md:h-8 text-violet-500" />
                    Logs de Auditoría
                </h1>
                <p className="text-neutral-400 mt-1 text-sm">
                    Historial completo de acciones administrativas
                </p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => { setActiveTab("all"); setPagination(p => ({ ...p, page: 1 })); }}
                    className={cn(
                        "px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition",
                        activeTab === "all" ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 border border-transparent"
                    )}
                >
                    <Activity className="w-4 h-4 inline mr-1 md:mr-2" />
                    Todos
                </button>
                <button
                    onClick={() => { setActiveTab("actions"); setPagination(p => ({ ...p, page: 1 })); }}
                    className={cn(
                        "px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition",
                        activeTab === "actions" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 border border-transparent"
                    )}
                >
                    <Shield className="w-4 h-4 inline mr-1 md:mr-2" />
                    Acciones
                </button>
                <button
                    onClick={() => { setActiveTab("overrides"); setPagination(p => ({ ...p, page: 1 })); }}
                    className={cn(
                        "px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition",
                        activeTab === "overrides" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 border border-transparent"
                    )}
                >
                    <Settings2 className="w-4 h-4 inline mr-1 md:mr-2" />
                    Overrides
                </button>
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
                        {/* Desktop Table */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-neutral-400 text-sm border-b border-neutral-800 bg-neutral-900/50">
                                        <th className="px-6 py-4 font-medium">Fecha</th>
                                        <th className="px-6 py-4 font-medium">Tipo</th>
                                        <th className="px-6 py-4 font-medium">Admin</th>
                                        <th className="px-6 py-4 font-medium">Acción</th>
                                        <th className="px-6 py-4 font-medium">Objetivo</th>
                                        <th className="px-6 py-4 font-medium">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {logs.map((log) => {
                                        const target = getTargetInfo(log);
                                        return (
                                            <tr
                                                key={log.id}
                                                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                                className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition cursor-pointer"
                                            >
                                                <td className="px-6 py-4 text-neutral-400 whitespace-nowrap">
                                                    {formatDate(log.createdAt)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium",
                                                        log._type === "action" ? "bg-teal-500/20 text-teal-400" : "bg-amber-500/20 text-amber-400"
                                                    )}>
                                                        {log._type === "action" ? "Admin" : "Override"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-4 h-4 text-violet-500 shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className="text-violet-400 truncate block">{log.adminEmail || "Unknown"}</span>
                                                            {log.adminRole && (
                                                                <span className="text-[10px] text-neutral-600">{log.adminRole}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap",
                                                        ACTION_COLORS[log.action] || "bg-neutral-700/50 text-neutral-400"
                                                    )}>
                                                        {ACTION_LABELS[log.action] || log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-neutral-300">{target.name}</p>
                                                        <p className="text-xs text-neutral-600">{target.detail}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-neutral-400 max-w-xs truncate">
                                                    {formatChanges(log)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-neutral-800/50">
                            {logs.map((log) => {
                                const target = getTargetInfo(log);
                                return (
                                    <div
                                        key={log.id}
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                        className="p-4 space-y-2 active:bg-neutral-800/30 transition cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-medium",
                                                ACTION_COLORS[log.action] || "bg-neutral-700/50 text-neutral-400"
                                            )}>
                                                {ACTION_LABELS[log.action] || log.action}
                                            </span>
                                            <span className="text-[11px] text-neutral-500">{formatDate(log.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <Shield className="w-3 h-3 text-violet-500 shrink-0" />
                                            <span className="text-violet-400 truncate">{log.adminEmail || "Unknown"}</span>
                                        </div>
                                        <p className="text-xs text-neutral-400 truncate">{formatChanges(log)}</p>
                                    </div>
                                );
                            })}
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
                                    Página {pagination.page} de {pagination.totalPages || 1}
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-neutral-500 mb-1">Admin</p>
                                                <p className="text-violet-400">{log.adminEmail || "Unknown"}</p>
                                                {log.adminRole && <p className="text-xs text-neutral-600">{log.adminRole}</p>}
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 mb-1">Acción</p>
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-medium",
                                                    ACTION_COLORS[log.action] || "bg-neutral-700/50 text-neutral-400"
                                                )}>
                                                    {ACTION_LABELS[log.action] || log.action}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 mb-1">Fecha</p>
                                                <p>{formatDate(log.createdAt)}</p>
                                            </div>
                                            {log.resourceType && (
                                                <div>
                                                    <p className="text-xs text-neutral-500 mb-1">Recurso</p>
                                                    <p>{log.resourceType} <span className="text-neutral-600">{log.resourceId?.substring(0, 16)}</span></p>
                                                </div>
                                            )}
                                        </div>

                                        {(log.details || log.changes) && (
                                            <div>
                                                <p className="text-xs text-neutral-500 mb-1">{log._type === "override" ? "Cambios Aplicados" : "Detalles"}</p>
                                                <pre className="bg-neutral-800 p-4 rounded-xl text-xs overflow-x-auto">
                                                    {JSON.stringify(log.details || log.changes, null, 2)}
                                                </pre>
                                            </div>
                                        )}

                                        {log.previousValue && (
                                            <div>
                                                <p className="text-xs text-neutral-500 mb-1">Valor Anterior</p>
                                                <pre className="bg-neutral-800 p-4 rounded-xl text-xs overflow-x-auto">
                                                    {JSON.stringify(log.previousValue, null, 2)}
                                                </pre>
                                            </div>
                                        )}

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
