"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    Check, Trash2, Loader2, X, Folder, Download, Plus, AlertCircle, ListChecks, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentSourceCard, SourceAccount } from "./ContentSourceCard";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

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
                {/* 3. HERRAMIENTAS Y GUÍAS */}
                <section>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-neutral-600">Herramientas y Guías</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* CARD 1: KIT DE ORGANIZACIÓN */}
                        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 md:p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700 pointer-events-none" />

                            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                <div className="space-y-3">
                                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500 mb-2">
                                        <Folder className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-medium text-white">Kit de Organización</h3>
                                    <p className="text-neutral-400 text-sm leading-relaxed">
                                        Descarga la estructura de carpetas estándar. Incluye ejemplos para <strong>Estilo Closer</strong> (Editorial) y video.
                                    </p>
                                </div>

                                <a
                                    href="/api/utils/download-template"
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white transition px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm w-full"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar .ZIP
                                </a>
                            </div>
                        </div>

                        {/* CARD 2: CÓMO ORGANIZAR (MODAL) */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 md:p-8 relative overflow-hidden group hover:border-blue-500/30 transition-colors cursor-pointer">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-700 pointer-events-none" />

                                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                        <div className="space-y-3">
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-500 mb-2">
                                                <ListChecks className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-medium text-white">Guía de Estilos</h3>
                                            <p className="text-neutral-400 text-sm leading-relaxed">
                                                Aprende la diferencia entre una galería Standard y una <strong>Closer Gallery</strong>. El orden importa.
                                            </p>
                                        </div>

                                        <button className="bg-neutral-800 hover:bg-neutral-700 text-white transition px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm w-full">
                                            Ver Guía
                                        </button>
                                    </div>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl bg-neutral-900 border-neutral-800 text-white">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-light">El Arte de Organizar ✨</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-blue-400 border-b border-blue-500/20 pb-2">Estilo Standard</h4>
                                            <p className="text-xs text-neutral-400">Perfecto para entrega documental completa.</p>
                                            <ul className="text-sm text-neutral-300 space-y-1 list-disc list-inside bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                                                <li>Ceremonia/</li>
                                                <li>Recepción/</li>
                                                <li>Fiesta/</li>
                                                <li className="text-neutral-500">Videos/</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-pink-400 border-b border-pink-500/20 pb-2">Estilo Closer (Editorial)</h4>
                                            <p className="text-xs text-neutral-400">Diseñado para impactar visualmente.</p>
                                            <ul className="text-sm text-neutral-300 space-y-1 list-disc list-inside bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
                                                <li><span className="text-pink-200">Cover/</span> (Portada)</li>
                                                <li>Highlights/</li>
                                                <li>Verticales/ (Mobile first)</li>
                                                <li>Historia/</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-800 text-sm text-neutral-300">
                                        <p>
                                            <strong className="text-white">Tip de Oro:</strong> Descarga el <strong>Kit de Organización</strong>. Ya incluye ambas estructuras de carpetas listas para que solo arrastres tus fotos.
                                        </p>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* CARD 3: GALERÍAS COLABORATIVAS (MODAL) */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 md:p-8 relative overflow-hidden group hover:border-purple-500/30 transition-colors cursor-pointer">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-all duration-700 pointer-events-none" />

                                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                        <div className="space-y-3">
                                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-500 mb-2">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-medium text-white">Galerías Colaborativas</h3>
                                            <p className="text-neutral-400 text-sm leading-relaxed">
                                                Permite que invitados suban fotos via QR. Exclusivo para usuarios de Google Drive.
                                            </p>
                                        </div>

                                        <button className="bg-neutral-800 hover:bg-neutral-700 text-white transition px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm w-full">
                                            Cómo funciona
                                        </button>
                                    </div>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl bg-neutral-900 border-neutral-800 text-white">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-light">Galerías Colaborativas 🤝</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex gap-3 text-purple-300 text-sm">
                                        <img src="/assets/logos/drive.svg" className="w-5 h-5 opacity-80 shrink-0" alt="Drive" />
                                        <p>
                                            <strong>Nota Importante:</strong> Esta función requiere conectar una cuenta de <strong>Google Drive</strong>.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-bold text-white">¿Cómo funciona?</h4>
                                        <p className="text-neutral-400 text-sm">
                                            En bodas y eventos, generamos un código QR único. Tus invitados lo escanean y pueden subir sus fotos y videos directamente a una carpeta especial en tu Nube ("Uploads - Nombre Proyecto").
                                        </p>
                                    </div>

                                    <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-sm text-neutral-400">
                                        <p className="mb-2"><strong>Organización automática:</strong></p>
                                        <p>Closerlens crea una carpeta separada para cada evento, manteniendo tus archivos originales seguros y separados de las subidas de invitados.</p>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

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
