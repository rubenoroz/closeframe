"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Folder, Loader2, AlertCircle, ArrowLeft, PlusCircle, Check, Mail, Zap, Info, Cloud, ChevronRight } from "lucide-react";
import FolderBrowser from "@/components/FolderBrowser";
import Link from "next/link";

interface CloudAccount {
    id: string;
    email: string | null;
    provider: string;
    name: string | null;
}

export default function NewProjectPage() {
    const router = useRouter();
    const [step, setStep] = useState<"account" | "folder" | "header" | "saving">("account");
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [showBrowser, setShowBrowser] = useState(false);
    const [showVideoBrowser, setShowVideoBrowser] = useState(false);

    // Data to save
    const [selectedAccount, setSelectedAccount] = useState<CloudAccount | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);

    // Header customization
    const [headerTitle, setHeaderTitle] = useState("");
    const [headerFontFamily, setHeaderFontFamily] = useState("Inter");
    const [headerColor, setHeaderColor] = useState("#FFFFFF");
    const [headerBackground, setHeaderBackground] = useState<"dark" | "light">("dark");

    // Photo download options
    const [downloadJpgEnabled, setDownloadJpgEnabled] = useState(true);
    const [downloadRawEnabled, setDownloadRawEnabled] = useState(false);

    // Video tab
    const [enableVideoTab, setEnableVideoTab] = useState(false);
    const [videoFolder, setVideoFolder] = useState<{ id: string; name: string } | null>(null);
    const [downloadVideoHdEnabled, setDownloadVideoHdEnabled] = useState(true);
    const [downloadVideoRawEnabled, setDownloadVideoRawEnabled] = useState(false);

    useEffect(() => {
        fetch("/api/cloud/accounts")
            .then((res) => res.json())
            .then((data) => {
                // The API returns the array directly
                const cloudAccounts = Array.isArray(data) ? data : (data.accounts || []);
                setAccounts(cloudAccounts);
                if (cloudAccounts.length > 0) {
                    setSelectedAccount(cloudAccounts[0]);
                }
                setLoadingAccounts(false);
            })
            .catch((err) => {
                console.error(err);
                setLoadingAccounts(false);
            });
    }, []);

    const handleFolderSelect = (folder: { id: string; name: string }) => {
        setSelectedFolder(folder);
        setShowBrowser(false);
        // Auto-populate header title with folder name
        if (!headerTitle) {
            setHeaderTitle(folder.name);
        }
        setStep("header");
    };

    const handleCreateProject = async () => {
        if (!selectedAccount || !selectedFolder) return;

        setStep("saving");
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: selectedFolder.name,
                    cloudAccountId: selectedAccount.id,
                    rootFolderId: selectedFolder.id,
                    headerTitle: headerTitle || selectedFolder.name,
                    headerFontFamily,
                    headerColor,
                    headerBackground,
                    downloadJpgEnabled,
                    downloadRawEnabled,
                    enableVideoTab,
                    videoFolderId: enableVideoTab ? videoFolder?.id : null,
                    downloadVideoHdEnabled,
                    downloadVideoRawEnabled,
                })
            });

            if (!res.ok) throw new Error("Failed to create project");

            // Redirect to dashboard
            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            alert("Error al crear el proyecto");
            setStep("header");
        }
    };

    if (loadingAccounts) {
        return (
            <div className="flex h-full items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-neutral-500 hover:text-white mb-8 transition text-sm">
                <ArrowLeft className="w-4 h-4" /> Volver al dashboard
            </Link>

            <h1 className="text-3xl font-light mb-2">Nueva Galería</h1>
            <p className="text-neutral-400 mb-10 text-sm">Configura el origen de tus fotos para la nueva galería.</p>

            {/* Step 1: Account Selection */}
            {step === "account" && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold">1</div>
                        <h2 className="text-xl font-medium">Elige una cuenta de Drive</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {accounts.map((account) => (
                            <button
                                key={account.id}
                                onClick={() => setSelectedAccount(account)}
                                className={`flex items-center justify-between p-6 rounded-2xl border transition-all group shadow-2xl ${selectedAccount?.id === account.id
                                    ? "bg-neutral-800 border-emerald-500/50 shadow-emerald-500/10"
                                    : "bg-neutral-900 border-neutral-700/50 hover:bg-neutral-800 hover:border-neutral-600"
                                    }`}
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`p-3 rounded-xl transition-all ${selectedAccount?.id === account.id ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700"}`}>
                                        <Cloud className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-medium text-lg leading-tight ${selectedAccount?.id === account.id ? "text-white" : "text-neutral-200"}`}>
                                            {account.name || (account.email ? `Drive (${account.email})` : "Cuenta sin nombre")}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em]">{account.provider}</span>
                                            {account.email && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                                                    <span className="text-[10px] font-medium text-neutral-600">{account.email}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {selectedAccount?.id === account.id ? (
                                    <Check className="w-6 h-6 text-emerald-500" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full border border-neutral-800 group-hover:border-neutral-700 transition-colors" />
                                )}
                            </button>
                        ))}

                        <a
                            href="/api/connect/google"
                            className="flex items-center gap-4 p-5 rounded-2xl border border-dashed border-neutral-700/50 bg-neutral-900/40 hover:bg-neutral-900 hover:border-emerald-500/40 transition-all text-neutral-400 hover:text-white group"
                        >
                            <div className="p-2.5 rounded-xl bg-neutral-800 group-hover:bg-neutral-700 text-neutral-500 group-hover:text-emerald-400 transition">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            <div className="text-left font-medium">
                                Conectar otra cuenta de Google Drive
                            </div>
                        </a>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={() => setStep("folder")}
                            disabled={!selectedAccount}
                            className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-bold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-30 flex items-center justify-center gap-2"
                        >
                            Continuar al navegador de archivos <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Folder Selection */}
            {step === "folder" && selectedAccount && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                    <div className="flex items-center gap-4 mb-8 border-b border-neutral-800 pb-6">
                        <div className="w-10 h-10 bg-emerald-900/20 text-emerald-400 rounded-full flex items-center justify-center text-lg font-bold">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500">Nube activa</p>
                            <p className="font-medium text-emerald-400">
                                {selectedAccount.name || selectedAccount.email || "Cuenta conectada"}
                            </p>
                        </div>
                        <button
                            onClick={() => setStep("account")}
                            className="ml-auto text-xs font-medium text-neutral-500 hover:text-white underline underline-offset-4"
                        >
                            Cambiar cuenta
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold">2</div>
                        <div>
                            <p className="text-sm text-neutral-500">Origen de fotos</p>
                            <h3 className="text-lg font-medium">Selecciona una carpeta</h3>
                        </div>
                    </div>

                    <div className="pl-14">
                        <p className="text-neutral-400 mb-6 text-sm">
                            Elige la carpeta de Drive con tus fotos. El nombre de la carpeta se usará como título para la galería.
                        </p>

                        {/* Pro Tip: Folder Structure */}
                        <div className="mb-8 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4 text-blue-400">
                                <Zap className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Tip Profesional: Estructura de Proxies</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                        <Folder className="w-3.5 h-3.5 text-blue-400" /> /webjpg
                                    </div>
                                    <p className="text-[10px] text-neutral-500 italic">Previsualización rápida</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                        <Folder className="w-3.5 h-3.5 text-emerald-400" /> /jpg
                                    </div>
                                    <p className="text-[10px] text-neutral-500 italic">Descargas alta res</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                        <Folder className="w-3.5 h-3.5 text-orange-400" /> /raw
                                    </div>
                                    <p className="text-[10px] text-neutral-500 italic">Archivos originales</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-blue-500/10 flex gap-3 text-[11px] text-neutral-400 leading-relaxed">
                                <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                <span>Asegúrate de que los archivos tengan el <b>mismo nombre</b> en todas las carpetas. TuSet los vincula automáticamente.</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowBrowser(true)}
                            className="w-full py-8 border-2 border-dashed border-neutral-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all text-neutral-400 hover:text-emerald-400 group"
                        >
                            <div className="p-3 bg-neutral-800 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <Folder className="w-6 h-6" />
                            </div>
                            <span className="font-medium">Explorar mi Google Drive</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Header Customization */}
            {step === "header" && selectedAccount && selectedFolder && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                    <div className="flex items-center gap-4 mb-8 border-b border-neutral-800 pb-6">
                        <div className="w-10 h-10 bg-emerald-900/20 text-emerald-400 rounded-full flex items-center justify-center text-lg font-bold">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500">Carpeta seleccionada</p>
                            <p className="font-medium text-emerald-400">{selectedFolder.name}</p>
                        </div>
                        <button
                            onClick={() => setStep("folder")}
                            className="ml-auto text-xs font-medium text-neutral-500 hover:text-white underline underline-offset-4"
                        >
                            Cambiar carpeta
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold">3</div>
                        <div>
                            <p className="text-sm text-neutral-500">Personalización</p>
                            <h3 className="text-lg font-medium">Configura el header de tu galería</h3>
                        </div>
                    </div>

                    <div className="pl-14 space-y-6">
                        {/* Título del Evento */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-300">
                                Título del Evento
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Boda de Ana & Carlos"
                                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none transition"
                                value={headerTitle}
                                onChange={(e) => setHeaderTitle(e.target.value)}
                            />
                            <p className="text-xs text-neutral-500 mt-1">Se usará el nombre de la carpeta si lo dejas vacío</p>
                        </div>

                        {/* Selector de Fuente */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-300">Fuente</label>
                            <select
                                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none transition"
                                value={headerFontFamily}
                                onChange={(e) => setHeaderFontFamily(e.target.value)}
                            >
                                <option value="Inter">Inter (Moderna)</option>
                                <option value="Playfair Display">Playfair Display (Elegante)</option>
                                <option value="Montserrat">Montserrat (Limpia)</option>
                                <option value="Cormorant Garamond">Cormorant Garamond (Clásica)</option>
                                <option value="Poppins">Poppins (Geométrica)</option>
                            </select>
                        </div>

                        {/* Color Picker */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-300">Color del Texto</label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="color"
                                    className="w-16 h-12 rounded-xl cursor-pointer"
                                    value={headerColor}
                                    onChange={(e) => setHeaderColor(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none transition"
                                    value={headerColor}
                                    onChange={(e) => setHeaderColor(e.target.value)}
                                    placeholder="#FFFFFF"
                                />
                            </div>
                        </div>

                        {/* Toggle Fondo */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-300">Fondo</label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setHeaderBackground("dark")}
                                    className={`flex-1 py-3 rounded-xl border transition ${headerBackground === "dark"
                                        ? "bg-black text-white border-white"
                                        : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                        }`}
                                >
                                    Negro
                                </button>
                                <button
                                    onClick={() => setHeaderBackground("light")}
                                    className={`flex-1 py-3 rounded-xl border transition ${headerBackground === "light"
                                        ? "bg-white text-black border-black"
                                        : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                        }`}
                                >
                                    Blanco
                                </button>
                            </div>
                        </div>

                        {/* Photo Download Options */}
                        <div className="border-t border-neutral-800 pt-6 space-y-3">
                            <p className="text-sm font-medium text-neutral-300">Opciones de descarga de fotos</p>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={downloadJpgEnabled}
                                    onChange={(e) => setDownloadJpgEnabled(e.target.checked)}
                                    className="w-5 h-5 rounded accent-emerald-500"
                                />
                                <span className="text-sm text-neutral-300">Permitir descargas JPG (alta resolución)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={downloadRawEnabled}
                                    onChange={(e) => setDownloadRawEnabled(e.target.checked)}
                                    className="w-5 h-5 rounded accent-emerald-500"
                                />
                                <span className="text-sm text-neutral-300">Permitir descargas RAW</span>
                            </label>
                            <p className="text-xs text-neutral-500">Los clientes podrán descargar fotos en diferentes calidades según tu configuración</p>
                        </div>

                        {/* Habilitar Videos */}
                        <div className="border-t border-neutral-800 pt-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableVideoTab}
                                    onChange={(e) => setEnableVideoTab(e.target.checked)}
                                    className="w-5 h-5 rounded accent-emerald-500"
                                />
                                <span className="font-medium text-neutral-300">Habilitar tab de Videos</span>
                            </label>
                            <p className="text-xs text-neutral-500 mt-1 ml-8">Agrega una pestaña separada para videos</p>
                        </div>

                        {/* Selector de Carpeta de Videos (condicional) */}
                        {enableVideoTab && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-neutral-300">
                                        Carpeta de Videos
                                    </label>
                                    <button
                                        onClick={() => setShowVideoBrowser(true)}
                                        className="w-full py-4 border-2 border-dashed border-neutral-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 rounded-xl flex items-center justify-center gap-2 transition text-neutral-400 hover:text-emerald-400"
                                    >
                                        <Folder className="w-5 h-5" />
                                        {videoFolder ? videoFolder.name : "Seleccionar carpeta"}
                                    </button>
                                </div>

                                {/* Video Download Options */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-neutral-300">Opciones de descarga de videos</p>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={downloadVideoHdEnabled}
                                            onChange={(e) => setDownloadVideoHdEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded accent-emerald-500"
                                        />
                                        <span className="text-sm text-neutral-300">Permitir descargas HD</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={downloadVideoRawEnabled}
                                            onChange={(e) => setDownloadVideoRawEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded accent-emerald-500"
                                        />
                                        <span className="text-sm text-neutral-300">Permitir descargas RAW</span>
                                    </label>
                                    <p className="text-xs text-neutral-500">Los clientes podrán descargar videos en diferentes calidades según tu configuración</p>
                                </div>

                                {/* Video Proxy Structure Tip */}
                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4 text-blue-400">
                                        <Zap className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Tip: Estructura de Videos</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                                <Folder className="w-3.5 h-3.5 text-blue-400" /> /webmp4
                                            </div>
                                            <p className="text-[10px] text-neutral-500 italic">Streaming rápido</p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                                <Folder className="w-3.5 h-3.5 text-emerald-400" /> /hd
                                            </div>
                                            <p className="text-[10px] text-neutral-500 italic">Descargas alta calidad</p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                                <Folder className="w-3.5 h-3.5 text-orange-400" /> /raw
                                            </div>
                                            <p className="text-[10px] text-neutral-500 italic">Originales sin comprimir</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-blue-500/10 flex gap-3 text-[11px] text-neutral-400 leading-relaxed">
                                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        <span>Crea estas carpetas <b>dentro</b> de tu carpeta de videos. Los archivos deben tener el <b>mismo nombre</b> en todas las carpetas.</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Botón Crear */}
                        <div className="pt-4">
                            <button
                                onClick={handleCreateProject}
                                disabled={enableVideoTab && !videoFolder}
                                className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-bold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                Crear Galería <ChevronRight className="w-4 h-4" />
                            </button>
                            {enableVideoTab && !videoFolder && (
                                <p className="text-xs text-orange-400 mt-2 text-center">Selecciona una carpeta de videos para continuar</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Saving State */}
            {step === "saving" && (
                <div className="flex items-center gap-3 text-emerald-500 bg-emerald-950/20 border border-emerald-500/20 p-5 rounded-2xl">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Creando galería profesional...</span>
                </div>
            )}

            {/* Folder Browser Modal */}
            {showBrowser && selectedAccount && (
                <FolderBrowser
                    cloudAccountId={selectedAccount.id}
                    onSelect={handleFolderSelect}
                    onCancel={() => setShowBrowser(false)}
                />
            )}

            {/* Video Folder Browser Modal */}
            {showVideoBrowser && selectedAccount && (
                <FolderBrowser
                    cloudAccountId={selectedAccount.id}
                    onSelect={(folder) => {
                        setVideoFolder(folder);
                        setShowVideoBrowser(false);
                    }}
                    onCancel={() => setShowVideoBrowser(false)}
                />
            )}
        </div>
    );
}
