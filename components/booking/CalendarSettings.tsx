"use client";

import { useState, useEffect } from "react";
import {
    Calendar,
    RefreshCw,
    Trash2,
    Settings,
    Check,
    X,
    Loader2,
    ExternalLink,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarAccount {
    id: string;
    provider: "google_calendar" | "microsoft_outlook";
    email: string | null;
    name: string | null;
    syncEnabled: boolean;
    syncDirection: "read_only" | "bidirectional";
    showEventDetails: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
    lastSyncAt: string | null;
    syncStatus: string;
    syncError: string | null;
    selectedCalendars: string[] | null;
}

interface CalendarInfo {
    id: string;
    summary: string;
    primary?: boolean;
}

interface CalendarSettingsProps {
    onAccountsChange?: () => void;
}

export default function CalendarSettings({ onAccountsChange }: CalendarSettingsProps) {
    const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const [calendarLists, setCalendarLists] = useState<Record<string, CalendarInfo[]>>({});
    const [loadingCalendars, setLoadingCalendars] = useState<Record<string, boolean>>({});

    const fetchAccounts = async () => {
        try {
            const response = await fetch("/api/calendar/accounts");
            const data = await response.json();
            setAccounts(data.accounts || []);
        } catch (error) {
            console.error("Error fetching calendar accounts:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCalendars = async (accountId: string) => {
        if (calendarLists[accountId] || loadingCalendars[accountId]) return;

        setLoadingCalendars(prev => ({ ...prev, [accountId]: true }));
        try {
            const response = await fetch(`/api/calendar/calendars?accountId=${accountId}`);
            const data = await response.json();
            if (data.calendars) {
                setCalendarLists(prev => ({ ...prev, [accountId]: data.calendars }));
            }
        } catch (error) {
            console.error("Error fetching calendars:", error);
        } finally {
            setLoadingCalendars(prev => ({ ...prev, [accountId]: false }));
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Load calendars when expanding
    useEffect(() => {
        if (expandedAccount) {
            fetchCalendars(expandedAccount);
        }
    }, [expandedAccount]);

    const handleConnect = (provider: "google" | "microsoft") => {
        // Redirect to OAuth flow
        window.location.href = `/api/calendar/auth/${provider}`;
    };

    const handleSync = async (accountId: string) => {
        setSyncing(accountId);
        try {
            await fetch("/api/calendar/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId })
            });
            await fetchAccounts();
            onAccountsChange?.();
        } catch (error) {
            console.error("Error syncing:", error);
        } finally {
            setSyncing(null);
        }
    };

    const handleDisconnect = async (accountId: string) => {
        if (!confirm("¿Estás seguro de desconectar este calendario?")) return;

        setDeleting(accountId);
        try {
            await fetch(`/api/calendar/accounts?id=${accountId}`, {
                method: "DELETE"
            });
            await fetchAccounts();
            onAccountsChange?.();
        } catch (error) {
            console.error("Error disconnecting:", error);
        } finally {
            setDeleting(null);
        }
    };

    const handleUpdateSettings = async (
        accountId: string,
        settings: Partial<CalendarAccount>
    ) => {
        // Don't set updating global spinner for small changes if not needed, 
        // but here we want to block interaction
        setUpdating(accountId);
        try {
            await fetch("/api/calendar/accounts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId, ...settings })
            });
            await fetchAccounts();
        } catch (error) {
            console.error("Error updating settings:", error);
        } finally {
            setUpdating(null);
        }
    };

    const toggleCalendarSelection = (account: CalendarAccount, calendarId: string) => {
        const currentSelection = account.selectedCalendars || [];
        // If empty/null, it means "primary" by default logic, 
        // but for UI explicitly showing selection, we should handle it.
        // On first interaction, if null, we might want to pre-fill with just primary?
        // Or assume if null, we start with whatever is primary.

        let newSelection = [...currentSelection];

        // Initial state handling: if null, treat as if 'primary' was selected (if applicable)
        // or just start fresh. Let's make it robust:
        if (!account.selectedCalendars) {
            // If implicit primary, and we toggle one, we should probably ensure 'primary' is kept 
            // unless that's what we are toggling.
            // But simplest is: start empty, add the one clicked.
            // Wait, if it was implicit primary, users expect primary to stay enabled.
            // Let's find the primary calendar ID from the list.
            const list = calendarLists[account.id] || [];
            const primary = list.find(c => c.primary)?.id || 'primary';
            newSelection = [primary];
        }

        if (newSelection.includes(calendarId)) {
            newSelection = newSelection.filter(id => id !== calendarId);
        } else {
            newSelection.push(calendarId);
        }

        handleUpdateSettings(account.id, { selectedCalendars: newSelection });
    };


    const getProviderIcon = (provider: string) => {
        if (provider === "google_calendar") {
            return (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 9H21" stroke="currentColor" strokeWidth="2" />
                    <path d="M9 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M15 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="15" r="2" fill="#4285F4" />
                </svg>
            );
        }
        return (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M3 9H21" stroke="currentColor" strokeWidth="2" />
                <path d="M9 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M15 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <rect x="10" y="13" width="4" height="4" rx="0.5" fill="#0078D4" />
            </svg>
        );
    };

    const getProviderName = (provider: string) => {
        return provider === "google_calendar" ? "Google Calendar" : "Microsoft Outlook";
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "success": return "text-green-400";
            case "syncing": return "text-blue-400";
            case "error": return "text-red-400";
            default: return "text-neutral-400";
        }
    };

    const formatLastSync = (dateStr: string | null) => {
        if (!dateStr) return "Nunca";
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "Ahora";
        if (minutes < 60) return `Hace ${minutes} min`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours}h`;

        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600/20 rounded-xl">
                        <Calendar className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Calendarios Conectados</h3>
                        <p className="text-sm text-neutral-400">
                            Sincroniza tu agenda con calendarios externos
                        </p>
                    </div>
                </div>
            </div>

            {/* Connected Accounts */}
            {accounts.length > 0 && (
                <div className="space-y-3">
                    {accounts.map((account) => (
                        <div
                            key={account.id}
                            className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden"
                        >
                            {/* Account Header */}
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <div className="text-neutral-300">
                                        {getProviderIcon(account.provider)}
                                    </div>
                                    <div>
                                        <div className="font-medium text-white flex items-center gap-2">
                                            {account.name || getProviderName(account.provider)}
                                            <span className={cn("text-xs", getStatusColor(account.syncStatus))}>
                                                {account.syncStatus === "success" && <Check className="w-3 h-3" />}
                                                {account.syncStatus === "error" && <X className="w-3 h-3" />}
                                                {account.syncStatus === "syncing" && <Loader2 className="w-3 h-3 animate-spin" />}
                                            </span>
                                        </div>
                                        <div className="text-sm text-neutral-400">
                                            {account.email || "Sin email"}
                                            {" · "}
                                            <span className="text-neutral-500">
                                                Última sync: {formatLastSync(account.lastSyncAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Sync Button */}
                                    <button
                                        onClick={() => handleSync(account.id)}
                                        disabled={syncing === account.id}
                                        className="p-2 hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
                                        title="Sincronizar ahora"
                                    >
                                        <RefreshCw className={cn(
                                            "w-4 h-4 text-neutral-400",
                                            syncing === account.id && "animate-spin"
                                        )} />
                                    </button>

                                    {/* Settings Toggle */}
                                    <button
                                        onClick={() => setExpandedAccount(
                                            expandedAccount === account.id ? null : account.id
                                        )}
                                        className="p-2 hover:bg-neutral-800 rounded-lg transition"
                                        title="Configuración"
                                    >
                                        <ChevronDown className={cn(
                                            "w-4 h-4 text-neutral-400 transition-transform",
                                            expandedAccount === account.id && "rotate-180"
                                        )} />
                                    </button>

                                    {/* Disconnect Button */}
                                    <button
                                        onClick={() => handleDisconnect(account.id)}
                                        disabled={deleting === account.id}
                                        className="p-2 hover:bg-red-500/10 rounded-lg transition"
                                        title="Desconectar"
                                    >
                                        {deleting === account.id ? (
                                            <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Settings */}
                            {expandedAccount === account.id && (
                                <div className="border-t border-neutral-800 p-4 space-y-6 bg-neutral-950/50">

                                    {/* Calendars Selection */}
                                    <div>
                                        <h4 className="text-sm font-medium text-white mb-2">Calendarios a sincronizar</h4>
                                        {loadingCalendars[account.id] ? (
                                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Cargando calendarios...
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                {calendarLists[account.id]?.map(cal => {
                                                    // Determine if selected.
                                                    // If selectedCalendars is null, only primary is selected (implicit legacy behavior)
                                                    // But we want to show it explicitly.
                                                    const isSelected = account.selectedCalendars
                                                        ? account.selectedCalendars.includes(cal.id)
                                                        : cal.primary; // If null, select primary by default

                                                    return (
                                                        <label key={cal.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800/50 cursor-pointer transition">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <span className={cn("text-sm truncate", isSelected ? "text-white" : "text-neutral-400")}>
                                                                    {cal.summary}
                                                                </span>
                                                                {cal.primary && <span className="text-[10px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Principal</span>}
                                                            </div>
                                                            <div className={cn(
                                                                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                                isSelected ? "bg-emerald-600 border-emerald-600" : "border-neutral-700 bg-neutral-800"
                                                            )}>
                                                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={!!isSelected}
                                                                    onChange={() => toggleCalendarSelection(account, cal.id)}
                                                                />
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                                {(!calendarLists[account.id] || calendarLists[account.id].length === 0) && (
                                                    <p className="text-sm text-neutral-500 italic">No se encontraron calendarios adicionales.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-neutral-800" />

                                    {/* Sync Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-white">
                                                Sincronización automáticapy
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                Actualizar cada {account.refreshInterval} min
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUpdateSettings(account.id, {
                                                syncEnabled: !account.syncEnabled
                                            })}
                                            disabled={updating === account.id}
                                            className={cn(
                                                "w-11 h-6 rounded-full transition-colors relative",
                                                account.syncEnabled ? "bg-violet-600" : "bg-neutral-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                                                account.syncEnabled ? "translate-x-5" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </div>

                                    {/* Sync Direction */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-white">
                                                Dirección de sync
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                Bidireccional permite crear eventos desde Closerlens
                                            </div>
                                        </div>
                                        <select
                                            value={account.syncDirection}
                                            onChange={(e) => handleUpdateSettings(account.id, {
                                                syncDirection: e.target.value as "read_only" | "bidirectional"
                                            })}
                                            disabled={updating === account.id}
                                            className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white"
                                        >
                                            <option value="bidirectional">Bidireccional</option>
                                            <option value="read_only">Solo lectura</option>
                                        </select>
                                    </div>

                                    {/* Show Event Details */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-white">
                                                Mostrar detalles
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                Mostrar título y descripción o solo "Ocupado"
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUpdateSettings(account.id, {
                                                showEventDetails: !account.showEventDetails
                                            })}
                                            disabled={updating === account.id}
                                            className={cn(
                                                "w-11 h-6 rounded-full transition-colors relative",
                                                account.showEventDetails ? "bg-violet-600" : "bg-neutral-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                                                account.showEventDetails ? "translate-x-5" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </div>

                                    {/* Error Display */}
                                    {account.syncError && (
                                        <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
                                            Error: {account.syncError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Connect New Calendar */}
            <div className="pt-4 border-t border-neutral-800">
                <p className="text-sm text-neutral-400 mb-3">Conectar nuevo calendario:</p>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleConnect("google")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-sm font-medium transition"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google Calendar
                        <ExternalLink className="w-3 h-3 text-neutral-500" />
                    </button>

                    <button
                        onClick={() => handleConnect("microsoft")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-sm font-medium transition"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                            <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
                            <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
                            <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
                        </svg>
                        Microsoft Outlook
                        <ExternalLink className="w-3 h-3 text-neutral-500" />
                    </button>
                </div>
            </div>

            {/* Help Text */}
            {accounts.length === 0 && (
                <div className="text-center py-6 text-neutral-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No tienes calendarios conectados</p>
                    <p className="text-sm text-neutral-500 mt-1">
                        Conecta Google Calendar o Outlook para ver tus eventos aquí
                    </p>
                </div>
            )}
        </div>
    );
}
