"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Cloud, HardDrive, CheckCircle, AlertCircle, RefreshCw,
    Trash2, Plus, Loader2, Edit2, Check, X, Folder, Download
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CloudAccount {
    id: string;
    provider: string;
    providerId: string;
    name: string | null;
    email: string | null;
    projects: any[];
}

export default function CloudManager() {
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempName, setTempName] = useState("");

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await fetch("/api/cloud/accounts");
            const data = await res.json();
            setAccounts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRename = async (id: string) => {
        try {
            const res = await fetch("/api/cloud/accounts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name: tempName })
            });
            if (res.ok) {
                setAccounts(accounts.map(a => a.id === id ? { ...a, name: tempName } : a));
                setEditingId(null);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres desconectar esta nube? Las galerías asociadas podrían dejar de funcionar.")) return;
        try {
            const res = await fetch(`/api/cloud/accounts?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setAccounts(accounts.filter(a => a.id !== id));
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando nubes...
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-900 pb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-light mb-4 text-white">Gestor de nubes</h1>
                    <p className="text-neutral-500 text-sm italic">Administra tus conexiones y organiza tus fuentes de archivos.</p>
                </div>
            </header>

            <main>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.map((account) => (
                        <motion.div
                            key={account.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            className="rounded-2xl border border-neutral-700/50 bg-neutral-900 p-6 flex flex-col group transition-all hover:bg-neutral-800/80 hover:border-emerald-500/30 border-b-4 shadow-2xl shadow-black/50"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex-1 min-w-0">
                                    {editingId === account.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                value={tempName}
                                                onChange={(e) => setTempName(e.target.value)}
                                                className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-sm outline-none text-white w-full"
                                                onKeyDown={(e) => e.key === "Enter" && handleRename(account.id)}
                                            />
                                            <button onClick={() => handleRename(account.id)} className="text-emerald-500 hover:text-emerald-400">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="text-neutral-500 hover:text-neutral-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-4 h-4 text-neutral-500 shrink-0" />
                                                <span className="text-sm font-medium truncate text-white">
                                                    {account.name || `Drive - ${account.email}`}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(account.id);
                                                        setTempName(account.name || "");
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Edit2 className="w-3 h-3 text-neutral-500 hover:text-white" />
                                                </button>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold ml-6">
                                                {account.provider}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 shrink-0">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                </div>
                            </div>

                            {/* Quota Display Component */}
                            <QuotaDisplay accountId={account.id} />

                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => window.location.href = `/api/connect/google?prompt=consent`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 transition text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white"
                                >
                                    <RefreshCw className="w-3 h-3" /> Reautorizar
                                </button>
                                <button
                                    onClick={() => handleDelete(account.id)}
                                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-neutral-800 hover:border-red-500/50 hover:bg-red-500/10 transition text-neutral-500 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Herramientas de Organización - Template Download */}
                <section className="mt-12 bg-neutral-900 rounded-3xl border border-neutral-800 p-8 md:p-12 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700 pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="space-y-4 max-w-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
                                    <Folder className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-medium text-white">Kit de Organización Inteligente</h2>
                            </div>
                            <p className="text-neutral-400 leading-relaxed">
                                ¿Quieres que tus RAWs y JPGs de alta resolución se detecten automáticamente?
                                Descarga nuestra estructura de carpetas oficial y úsala como plantilla en tu Google Drive.
                            </p>
                            <ul className="text-sm text-neutral-500 flex flex-col gap-2">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Carpetas listas: <code className="bg-black/30 px-1 rounded border border-white/5">webjpg</code>, <code className="bg-black/30 px-1 rounded border border-white/5">jpg</code>, <code className="bg-black/30 px-1 rounded border border-white/5">raw</code></li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Incluye guía de nombrado de archivos</li>
                            </ul>
                        </div>

                        <a
                            href="/api/utils/download-template"
                            className="bg-white text-black hover:bg-neutral-200 transition px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-300 whitespace-nowrap"
                        >
                            <Download className="w-5 h-5" />
                            Descargar Estructura .ZIP
                        </a>
                    </div>
                </section>

                <section className="mt-20">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-10 text-neutral-600">Nuevas conexiones disponibles</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <motion.button
                            whileHover={{ y: -5 }}
                            className="h-32 rounded-2xl border border-neutral-700/50 bg-neutral-900 flex flex-col items-center justify-center gap-3 transition-all hover:bg-neutral-800 hover:border-emerald-500/20 shadow-xl"
                            onClick={() => window.location.href = "/api/connect/google"}
                        >
                            <div className="w-12 h-12 flex items-center justify-center">
                                <svg width="32" height="30" viewBox="0 0 112 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_drive)">
                                        <path d="M8.46154 85.7051L13.3974 94.2308C14.4231 96.0256 15.8974 97.4359 17.6282 98.4615L35.2564 67.9487H0C0 69.9359 0.512821 71.9231 1.53846 73.7179L8.46154 85.7051Z" fill="#0066DA" />
                                        <path d="M55.9615 32.0513L38.3333 1.53846C36.6026 2.5641 35.1282 3.97436 34.1026 5.76923L1.53846 62.1795C0.531683 63.9357 0.00134047 65.9244 0 67.9487H35.2564L55.9615 32.0513Z" fill="#00AC47" />
                                        <path d="M94.2949 98.4615C96.0256 97.4359 97.5 96.0256 98.5256 94.2308L100.577 90.7051L110.385 73.7179C111.41 71.9231 111.923 69.9359 111.923 67.9487H76.6641L84.1667 82.6923L94.2949 98.4615Z" fill="#EA4335" />
                                        <path d="M55.9615 32.0513L73.5898 1.53846C71.859 0.512821 69.8718 0 67.8205 0H44.1026C42.0513 0 40.0641 0.576923 38.3333 1.53846L55.9615 32.0513Z" fill="#00832D" />
                                        <path d="M76.6667 67.9487H35.2564L17.6282 98.4615C19.359 99.4872 21.3462 100 23.3974 100H88.5256C90.5769 100 92.5641 99.4231 94.2949 98.4615L76.6667 67.9487Z" fill="#2684FC" />
                                        <path d="M94.1026 33.9744L77.8205 5.76923C76.7949 3.97436 75.3205 2.5641 73.5897 1.53846L55.9615 32.0513L76.6667 67.9487H111.859C111.859 65.9615 111.346 63.9744 110.321 62.1795L94.1026 33.9744Z" fill="#FFBA00" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_drive">
                                            <rect width="111.923" height="100" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>
                            <span className="text-xs font-medium text-neutral-400">Google Drive</span>
                        </motion.button>

                        {["Dropbox", "OneDrive", "Box"].map((provider) => (
                            <div
                                key={provider}
                                className="h-32 rounded-2xl border border-neutral-800 bg-neutral-900/20 flex flex-col items-center justify-center gap-3 grayscale opacity-30 cursor-not-allowed"
                            >
                                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                                    <Cloud className="w-6 h-6 text-neutral-600" />
                                </div>
                                <span className="text-xs font-medium text-neutral-600">{provider}</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-700">Próximamente</span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

function QuotaDisplay({ accountId }: { accountId: string }) {
    const [quota, setQuota] = useState<{ usage: number, limit: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/cloud/quota?cloudAccountId=${accountId}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && typeof data.usage === 'number') setQuota(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [accountId]);

    if (loading) return (
        <div className="space-y-4 mb-8 w-full animate-pulse opacity-50">
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Espacio Utilizado</span>
                    <span className="text-lg font-light text-neutral-400 tracking-widest">Calculando...</span>
                </div>
            </div>
            <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden" />
        </div>
    );

    if (!quota) return (
        <div className="space-y-4 mb-8 w-full">
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Espacio Utilizado</span>
            <div className="text-neutral-500 text-sm">No disponible</div>
        </div>
    );

    const usedGB = (quota.usage / 1024 / 1024 / 1024).toFixed(2);
    const totalGB = quota.limit > 0 ? (quota.limit / 1024 / 1024 / 1024).toFixed(0) : "∞";
    const percent = quota.limit > 0 ? Math.min(100, (quota.usage / quota.limit) * 100) : 0;
    const isFull = percent > 90;

    return (
        <div className="space-y-4 mb-8 w-full">
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Espacio Utilizado</span>
                    <span className="text-lg font-light text-white tracking-widest">{usedGB} GB <span className="text-neutral-600 text-sm">/ {totalGB} GB</span></span>
                </div>
                <div className={cn("w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors",
                    isFull ? "border-red-500/20 border-t-red-500" : "border-emerald-500/20 border-t-emerald-500"
                )}>
                    <span className={cn("text-[10px] font-bold", isFull ? "text-red-500" : "text-emerald-500")}>
                        {Math.round(percent)}%
                    </span>
                </div>
            </div>
            <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-1000 ease-out", isFull ? "bg-red-500" : "bg-emerald-500")}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
