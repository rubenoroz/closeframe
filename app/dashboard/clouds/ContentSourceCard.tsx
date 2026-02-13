"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, RefreshCw, Trash2, Edit2, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuotaDisplay } from "./QuotaDisplay";

export interface SourceAccount {
    id: string;
    provider: string; // 'google', 'dropbox', etc.
    name: string | null;
    email: string | null;
    image?: string | null;
    type: 'storage' | 'video'; // To differentiate logic
}

interface ContentSourceCardProps {
    account: SourceAccount;
    onRename?: (id: string, newName: string) => Promise<void>;
    onDisconnect: (id: string, type: 'storage' | 'video') => void;
    onReauthorize: (account: SourceAccount) => void;
}

export function ContentSourceCard({ account, onRename, onDisconnect, onReauthorize }: ContentSourceCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(account.name || "");
    const [authError, setAuthError] = useState<string | null>(null);

    const handleSaveRename = () => {
        if (onRename) {
            onRename(account.id, tempName);
            setIsEditing(false);
        }
    };

    // Helper to get nicer names
    const getProviderDisplayName = (provider: string) => {
        const map: Record<string, string> = {
            microsoft: "Onedrive",
            google: "Drive",
            dropbox: "Dropbox",
            koofr: "Koofr",
            youtube: "YouTube",
            vimeo: "Vimeo"
        };
        return map[provider] || provider;
    };

    // Helper to get icon filename
    const getProviderIcon = (provider: string) => {
        const map: Record<string, string> = {
            microsoft: "onedrive.svg",
            google: "drive.svg",
            dropbox: "dropbox.svg",
            koofr: "koofr.svg",
            youtube: "youtube.svg",
            vimeo: "vimeo.svg"
        };
        return map[provider] || `${provider}.svg`;
    };

    const isStorage = account.type === 'storage';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className={cn(
                "rounded-xl md:rounded-2xl border border-neutral-700/50 bg-neutral-900 p-4 md:p-6 flex flex-col group transition-all hover:bg-neutral-800/80 border-b-4 shadow-2xl shadow-black/50",
                authError ? "border-red-500/50 hover:border-red-500" : "hover:border-emerald-500/30"
            )}
        >
            <div className="flex items-start justify-between mb-6 md:mb-8">
                <div className="flex-1 min-w-0 flex items-start gap-3">
                    {/* Logo/Icon */}
                    <div className="w-10 h-10 rounded-full bg-black/40 border border-neutral-800 flex items-center justify-center shrink-0 p-2 overflow-hidden">
                        <img
                            src={account.image || `/assets/logos/${getProviderIcon(account.provider)}`}
                            alt={account.provider}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                // Fallback icon if image fails
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    autoFocus
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-sm outline-none text-white w-full"
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                                />
                                <button onClick={handleSaveRename} className="text-emerald-500 hover:text-emerald-400">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsEditing(false)} className="text-neutral-500 hover:text-neutral-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold truncate text-white">
                                        {getProviderDisplayName(account.provider)}
                                    </span>

                                    {isStorage && onRename && (
                                        <button
                                            onClick={() => {
                                                setIsEditing(true);
                                                setTempName(account.name || "");
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Edit2 className="w-3 h-3 text-neutral-500 hover:text-white" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-neutral-400 truncate">
                                    {authError ? (
                                        <span className="text-red-400 font-bold animate-pulse">Renovar Conexión</span>
                                    ) : (
                                        account.email || account.name || "Cuenta Conectada"
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {authError ? (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 shrink-0" title="Requiere Re-autorización">
                        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                    </div>
                ) : (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 shrink-0" title="Conectado y Activo">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                )}
            </div>

            {/* Metrics (Only for Storage) */}
            {isStorage && (
                <QuotaDisplay
                    accountId={account.id}
                    onError={(err) => setAuthError(err)}
                />
            )}

            {!isStorage && (
                // Spacer for Video cards to align better with storage cards if they're in the same grid?
                // Or just some content
                <div className="mb-6 flex-1 flex items-center justify-center opacity-30">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">
                        Integración de Video
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-auto pt-4 border-t border-neutral-800/50">
                <button
                    onClick={() => onReauthorize(account)}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border transition text-[9px] md:text-[10px] font-bold uppercase tracking-widest",
                        authError
                            ? "border-red-500 bg-red-500/10 text-red-200 hover:bg-red-500 hover:text-white animate-pulse"
                            : "border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    )}
                >
                    {authError ? <AlertTriangle className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                    <span className="hidden sm:inline">Re</span>autorizar
                </button>
                <button
                    onClick={() => onDisconnect(account.id, account.type)}
                    className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl border border-neutral-800 hover:border-red-500/50 hover:bg-red-500/10 transition text-neutral-500 hover:text-red-500"
                    title="Desconectar fuente"
                >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
            </div>
        </motion.div>
    );
}
