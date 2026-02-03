"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    Check, Trash2, Loader2, X, Folder, Download, Plus, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentSourceCard, SourceAccount } from "./ContentSourceCard";

// Types
interface CloudAccount {
    id: string;
    provider: string;
    providerId: string;
    name: string | null;
    email: string | null;
    projects: any[];
}

function CloudManagerContent() {
    const searchParams = useSearchParams();
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [videoAccounts, setVideoAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Koofr State
    const [showKoofrModal, setShowKoofrModal] = useState(false);
    const [koofrCreds, setKoofrCreds] = useState({ email: "", password: "" });
    const [isConnectingKoofr, setIsConnectingKoofr] = useState(false);
    const [koofrError, setKoofrError] = useState<string | null>(null);

    // Fetch Accounts
    const fetchAccounts = async () => {
        try {
            const res = await fetch("/api/cloud/accounts");
            if (!res.ok) throw new Error("Failed to fetch accounts");

            const data = await res.json();

            if (data && typeof data === 'object' && !Array.isArray(data)) {
                setAccounts(Array.isArray(data.storage) ? data.storage : []);
                setVideoAccounts(Array.isArray(data.video) ? data.video : []);
            } else if (Array.isArray(data)) {
                setAccounts(data);
                setVideoAccounts([]);
            } else {
                setAccounts([]);
                setVideoAccounts([]);
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Error / Alert Logic
    const errorType = searchParams.get("error");
    const errorMessage = searchParams.get("message");

    useEffect(() => {
        if (errorType === "plan_limit") {
            const message = errorMessage
                ? decodeURIComponent(errorMessage)
                : "Has alcanzado el límite de nubes conectadas de tu plan.";
            alert(`⚠️ Límite de plan alcanzado\n\n${message}\n\nVisita la sección de planes para actualizar tu suscripción.`);
            window.history.replaceState({}, "", "/dashboard/clouds");
        }
    }, [errorType, errorMessage]);

    // Actions
    const handleRename = async (id: string, newName: string) => {
        try {
            const res = await fetch("/api/cloud/accounts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name: newName })
            });
            if (res.ok) {
                setAccounts(accounts.map(a => a.id === id ? { ...a, name: newName } : a));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDisconnect = async (id: string, type: 'storage' | 'video') => {
        if (!confirm("¿Estás seguro de que quieres desconectar esta fuente?")) return;
        try {
            const queryType = type === 'video' ? 'video' : 'storage';
            const res = await fetch(`/api/cloud/accounts?id=${id}&type=${queryType}`, {
                method: "DELETE"
            });
            if (res.ok) {
                if (type === "video") {
                    setVideoAccounts(videoAccounts.filter(a => a.id !== id));
                } else {
                    setAccounts(accounts.filter(a => a.id !== id));
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleReauthorize = (account: SourceAccount) => {
        if (account.provider === 'google') {
            window.location.href = `/api/connect/google?prompt=consent`;
        } else if (account.provider === 'microsoft') {
            window.location.href = `/api/connect/microsoft?prompt=login`;
        } else if (account.provider === 'dropbox') {
            window.location.href = `/api/connect/dropbox`;
        } else if (account.provider === 'koofr') {
            setShowKoofrModal(true);
        } else if (account.provider === 'youtube') {
            window.location.href = "/api/auth/connect/youtube";
        } else if (account.provider === 'vimeo') {
            window.location.href = "/api/auth/connect/vimeo";
        }
    };

    const handleConnectKoofr = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsConnectingKoofr(true);
        setKoofrError(null);
        try {
            const res = await fetch("/api/connect/koofr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(koofrCreds)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al conectar");
            setShowKoofrModal(false);
            setKoofrCreds({ email: "", password: "" });
            fetchAccounts();
        } catch (err: any) {
            setKoofrError(err.message);
        } finally {
            setIsConnectingKoofr(false);
        }
    };

    // Combine Sources
    const connectedSources: SourceAccount[] = [
        ...accounts.map(a => ({
            id: a.id,
            provider: a.provider,
            name: a.name,
            email: a.email,
            type: 'storage' as const
        })),
        ...videoAccounts.map(a => ({
            id: a.id,
            provider: a.provider,
            name: a.name,
            email: null,
            image: a.image,
            type: 'video' as const
        }))
    ];

    // Available Providers Logic
    const allProviders = [
        { id: 'google', name: 'Google Drive', type: 'storage' },
        { id: 'microsoft', name: 'OneDrive', type: 'storage' },
        { id: 'dropbox', name: 'Dropbox', type: 'storage' },
        { id: 'koofr', name: 'Koofr', type: 'storage' },
        { id: 'youtube', name: 'YouTube', type: 'video' },
        { id: 'vimeo', name: 'Vimeo', type: 'video' },
    ];

    // Filter out already connected providers
    // FIX: User reported they want to add more accounts even if one is connected.
    // Removed filtering to allow multiple accounts per provider.
    const availableProviders = allProviders;

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando fuentes...
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12">

            {/* HEADER */}
            <header className="flex flex-col gap-3 md:gap-6 border-b border-neutral-900 pb-6 md:pb-8">
                <div>
                    <h1 className="text-xl md:text-3xl lg:text-4xl font-light mb-2 md:mb-4 text-white">Fuentes de contenido</h1>
                    <p className="text-neutral-500 text-xs md:text-sm italic">Conecta y administra desde dónde Closerlens obtiene tu contenido.</p>
                </div>
            </header>

            <main className="space-y-16">

                {/* 1. FUENTES CONECTADAS */}
                <section>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-neutral-600">Fuentes conectadas</h2>

                    {connectedSources.length === 0 ? (
                        <div className="text-neutral-500 text-sm italic py-8 border border-dashed border-neutral-800 rounded-xl flex items-center justify-center bg-neutral-900/50">
                            No tienes ninguna fuente conectada.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {connectedSources.map(source => (
                                <ContentSourceCard
                                    key={`${source.type}-${source.id}`}
                                    account={source}
                                    onRename={handleRename}
                                    onDisconnect={handleDisconnect}
                                    onReauthorize={handleReauthorize}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* 2. AGREGAR NUEVA FUENTE */}
                {availableProviders.length > 0 && (
                    <section>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-neutral-600">Agregar nueva fuente</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {availableProviders.map(provider => (
                                <AddSourceButton
                                    key={provider.id}
                                    provider={provider}
                                    onConnect={() => {
                                        if (provider.id === 'google') window.location.href = "/api/connect/google";
                                        else if (provider.id === 'microsoft') window.location.href = "/api/connect/microsoft";
                                        else if (provider.id === 'dropbox') window.location.href = "/api/connect/dropbox";
                                        else if (provider.id === 'koofr') setShowKoofrModal(true);
                                        else if (provider.id === 'youtube') window.location.href = "/api/auth/connect/youtube";
                                        else if (provider.id === 'vimeo') window.location.href = "/api/auth/connect/vimeo";
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 3. HERRAMIENTAS */}
                <section>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-neutral-600">Herramientas</h2>

                    <div className="bg-neutral-900 rounded-2xl md:rounded-3xl border border-neutral-800 p-5 md:p-8 lg:p-12 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700 pointer-events-none" />

                        <div className="relative z-10 flex flex-col gap-5 md:gap-8">
                            <div className="space-y-3 md:space-y-4">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="p-1.5 md:p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
                                        <Folder className="w-4 h-4 md:w-6 md:h-6" />
                                    </div>
                                    <h2 className="text-base md:text-xl font-medium text-white">Kit de Organización</h2>
                                </div>
                                <p className="text-neutral-400 leading-relaxed text-xs md:text-base">
                                    Descarga la estructura de carpetas estándar. Si organizas tus archivos así, Closerlens los detectará automáticamente sin configuración extra.
                                </p>
                            </div>

                            <a
                                href="/api/utils/download-template"
                                className="bg-white text-black hover:bg-neutral-200 transition px-5 md:px-8 py-3 md:py-4 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-2 md:gap-3 shadow-xl text-sm md:text-base w-full md:w-auto md:self-start"
                            >
                                <Download className="w-4 h-4 md:w-5 md:h-5" />
                                Descargar .ZIP
                            </a>
                        </div>
                    </div>
                </section>

                {/* MODALS */}
                {showKoofrModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl relative">
                            <button
                                onClick={() => setShowKoofrModal(false)}
                                className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 flex items-center justify-center relative bg-white/10 rounded-full p-2">
                                    <img src="/assets/logos/koofr.svg" alt="Koofr" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Conectar Koofr</h3>
                                    <p className="text-sm text-neutral-400">Introduce tus credenciales de aplicación.</p>
                                </div>
                            </div>

                            <form onSubmit={handleConnectKoofr} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={koofrCreds.email}
                                        onChange={e => setKoofrCreds({ ...koofrCreds, email: e.target.value })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition"
                                        placeholder="tu@email.com"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Contraseña de Aplicación</label>
                                    <input
                                        type="password"
                                        required
                                        value={koofrCreds.password}
                                        onChange={e => setKoofrCreds({ ...koofrCreds, password: e.target.value })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition"
                                        placeholder="Generada en Preferencias > Password"
                                    />
                                </div>

                                {koofrError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {koofrError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isConnectingKoofr}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isConnectingKoofr ? <Loader2 className="w-4 h-4 animate-spin" /> : "Conectar"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function AddSourceButton({ provider, onConnect }: { provider: { id: string, name: string }, onConnect: () => void }) {
    // Helper to get icon filename
    const getProviderIcon = (providerId: string) => {
        const map: Record<string, string> = {
            microsoft: "onedrive.svg",
            google: "drive.svg", // Fixed: google ID -> drive.svg
            dropbox: "dropbox.svg",
            koofr: "koofr.svg",
            youtube: "youtube.svg",
            vimeo: "vimeo.svg"
        };
        return map[providerId] || `${providerId}.svg`;
    };

    return (
        <motion.button
            whileHover={{ y: -5 }}
            onClick={onConnect}
            className="h-32 rounded-2xl border border-neutral-700/50 bg-neutral-900 flex flex-col items-center justify-center gap-3 transition-all hover:bg-neutral-800 hover:border-white/20 shadow-xl group"
        >
            <div className="w-14 h-14 flex items-center justify-center p-2 bg-black/20 rounded-xl border border-neutral-800/50">
                <img
                    src={`/assets/logos/${getProviderIcon(provider.id)}`}
                    alt={provider.name}
                    className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-white">{provider.name}</span>
                <span className="text-[10px] uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold tracking-wider">Conectar</span>
            </div>
        </motion.button>
    );
}

export default function CloudManager() {
    return (
        <Suspense fallback={
            <div className="flex h-[60vh] items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        }>
            <CloudManagerContent />
        </Suspense>
    );
}
