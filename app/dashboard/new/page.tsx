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
    const [headerFontSize, setHeaderFontSize] = useState(100);
    const [headerColor, setHeaderColor] = useState("#FFFFFF");
    const [headerBackground, setHeaderBackground] = useState<"dark" | "light">("dark");
    const [enableWatermark, setEnableWatermark] = useState(false);

    // Photo download options
    const [downloadJpgEnabled, setDownloadJpgEnabled] = useState(true);
    const [downloadRawEnabled, setDownloadRawEnabled] = useState(false);

    // Video tab
    const [enableVideoTab, setEnableVideoTab] = useState(false);
    const [videoFolder, setVideoFolder] = useState<{ id: string; name: string } | null>(null);
    const [downloadVideoHdEnabled, setDownloadVideoHdEnabled] = useState(true);
    const [downloadVideoRawEnabled, setDownloadVideoRawEnabled] = useState(false);

    // Plan limits
    const [planLimits, setPlanLimits] = useState<{
        videoEnabled?: boolean;
        lowResDownloads?: boolean;
    } | null>(null);

    useEffect(() => {
        fetch("/api/cloud/accounts")
            .then((res) => res.json())
            .then((data) => {
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

        // Fetch user plan limits
        fetch("/api/user/settings")
            .then((res) => res.json())
            .then((data) => {
                if (data.effectiveConfig) {
                    setPlanLimits({
                        videoEnabled: data.effectiveConfig.features?.videoGallery,
                        lowResDownloads: data.effectiveConfig.features?.lowResDownloads,
                    });
                } else if (data.user?.plan?.limits) {
                    try {
                        const limits = typeof data.user.plan.limits === 'string'
                            ? JSON.parse(data.user.plan.limits)
                            : data.user.plan.limits;
                        setPlanLimits(limits);
                    } catch { }
                }
            })
            .catch(() => { });
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
                    headerFontSize,
                    headerColor,
                    headerBackground,
                    enableWatermark,
                    downloadJpgEnabled,
                    downloadRawEnabled,
                    enableVideoTab,
                    videoFolderId: enableVideoTab ? videoFolder?.id : null,
                    downloadVideoHdEnabled,
                    downloadVideoRawEnabled,
                })
            });

            const data = await res.json();

            if (!res.ok) {
                // Check for plan limit error
                if (data.code === "PLAN_LIMIT_REACHED") {
                    alert(`\u26a0\ufe0f L\u00edmite de plan alcanzado\n\n${data.error}\n\nVisita la secci\u00f3n de planes para actualizar tu suscripci\u00f3n.`);
                } else {
                    alert(data.error || "Error al crear el proyecto");
                }
                setStep("header");
                return;
            }

            // Redirect to dashboard
            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            alert("Error de conexi\u00f3n. Por favor intenta de nuevo.");
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
        <div className="max-w-2xl mx-auto py-6 md:py-10 px-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-neutral-500 hover:text-white mb-6 md:mb-8 transition text-xs md:text-sm">
                <ArrowLeft className="w-4 h-4" /> Volver al dashboard
            </Link>

            <h1 className="text-2xl md:text-3xl font-light mb-2">Nueva Galería</h1>
            <p className="text-neutral-400 mb-8 md:mb-10 text-xs md:text-sm">Configura el origen de tus fotos para la nueva galería.</p>

            {/* Step 1: Account Selection */}
            {step === "account" && (
                <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 md:gap-4 mb-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-white text-black rounded-full flex items-center justify-center text-base md:text-lg font-bold">1</div>
                        <h2 className="text-lg md:text-xl font-medium">Elige una cuenta de Drive</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {accounts.map((account) => (
                            <button
                                key={account.id}
                                onClick={() => setSelectedAccount(account)}
                                className={`flex items-center justify-between p-4 md:p-6 rounded-xl md:rounded-2xl border transition-all group shadow-2xl ${selectedAccount?.id === account.id
                                    ? "bg-neutral-800 border-emerald-500/50 shadow-emerald-500/10"
                                    : "bg-neutral-900 border-neutral-700/50 hover:bg-neutral-800 hover:border-neutral-600"
                                    }`}
                            >
                                <div className="flex items-center gap-3 md:gap-5">
                                    <div className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all ${selectedAccount?.id === account.id ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700"}`}>
                                        <Cloud className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-medium text-sm md:text-lg leading-tight ${selectedAccount?.id === account.id ? "text-white" : "text-neutral-200"}`}>
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

                    <div className="pt-4 md:pt-6">
                        <button
                            onClick={() => setStep("folder")}
                            disabled={!selectedAccount}
                            className="w-full py-3 md:py-4 bg-emerald-500 text-black rounded-xl md:rounded-2xl font-bold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-30 flex items-center justify-center gap-2 text-sm md:text-base"
                        >
                            Continuar <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Folder Selection */}
            {step === "folder" && selectedAccount && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl md:rounded-2xl p-5 md:p-8">
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 md:mb-8 border-b border-neutral-800 pb-4 md:pb-6">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-900/20 text-emerald-400 rounded-full flex items-center justify-center text-base md:text-lg font-bold">
                            <Check className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm text-neutral-500">Nube activa</p>
                            <p className="font-medium text-emerald-400 text-sm md:text-base truncate">
                                {selectedAccount.name || selectedAccount.email || "Cuenta conectada"}
                            </p>
                        </div>
                        <button
                            onClick={() => setStep("account")}
                            className="text-xs font-medium text-neutral-500 hover:text-white underline underline-offset-4"
                        >
                            Cambiar
                        </button>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-white text-black rounded-full flex items-center justify-center text-base md:text-lg font-bold">2</div>
                        <div>
                            <p className="text-xs md:text-sm text-neutral-500">Origen de fotos</p>
                            <h3 className="text-base md:text-lg font-medium">Selecciona una carpeta</h3>
                        </div>
                    </div>

                    <div className="pl-0 md:pl-14">
                        <p className="text-neutral-400 mb-4 md:mb-6 text-xs md:text-sm">
                            Elige la carpeta de Drive con tus fotos.
                        </p>

                        {/* Pro Tip: Folder Structure */}
                        <div className="mb-6 md:mb-8 bg-blue-500/5 border border-blue-500/10 rounded-xl md:rounded-2xl p-4 md:p-6">
                            <div className="flex items-center gap-2 mb-3 md:mb-4 text-blue-400">
                                <Zap className="w-3 h-3 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Tip: Estructura de Proxies</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 md:gap-4">
                                <div className="space-y-0.5 md:space-y-1">
                                    <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-medium text-neutral-300">
                                        <Folder className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-400" /> /webjpg
                                    </div>
                                    <p className="text-[9px] md:text-[10px] text-neutral-500 italic hidden sm:block">Prevista</p>
                                </div>
                                <div className="space-y-0.5 md:space-y-1">
                                    <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-medium text-neutral-300">
                                        <Folder className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-400" /> /jpg
                                    </div>
                                    <p className="text-[9px] md:text-[10px] text-neutral-500 italic hidden sm:block">Alta res</p>
                                </div>
                                <div className="space-y-0.5 md:space-y-1">
                                    <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-medium text-neutral-300">
                                        <Folder className="w-3 h-3 md:w-3.5 md:h-3.5 text-orange-400" /> /raw
                                    </div>
                                    <p className="text-[9px] md:text-[10px] text-neutral-500 italic hidden sm:block">Original</p>
                                </div>
                            </div>
                            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-blue-500/10 flex gap-2 md:gap-3 text-[10px] md:text-[11px] text-neutral-400 leading-relaxed">
                                <Info className="w-3 h-3 md:w-4 md:h-4 text-blue-400 flex-shrink-0" />
                                <span>Los archivos deben tener el <b>mismo nombre</b> en todas las carpetas.</span>
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
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl md:rounded-2xl p-5 md:p-8">
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 md:mb-8 border-b border-neutral-800 pb-4 md:pb-6">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-900/20 text-emerald-400 rounded-full flex items-center justify-center text-base md:text-lg font-bold">
                            <Check className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm text-neutral-500">Carpeta seleccionada</p>
                            <p className="font-medium text-emerald-400 text-sm md:text-base truncate">{selectedFolder.name}</p>
                        </div>
                        <button
                            onClick={() => setStep("folder")}
                            className="text-xs font-medium text-neutral-500 hover:text-white underline underline-offset-4"
                        >
                            Cambiar
                        </button>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-white text-black rounded-full flex items-center justify-center text-base md:text-lg font-bold">3</div>
                        <div>
                            <p className="text-xs md:text-sm text-neutral-500">Personalización</p>
                            <h3 className="text-base md:text-lg font-medium">Configura el header</h3>
                        </div>
                    </div>

                    <div className="pl-0 md:pl-14 space-y-4 md:space-y-6">
                        {/* Título del Evento */}
                        <div>
                            <label className="block text-xs md:text-sm font-medium mb-2 text-neutral-300">
                                Título del Evento
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Boda de Ana & Carlos"
                                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-neutral-800 border border-neutral-700 rounded-lg md:rounded-xl text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none transition text-sm"
                                value={headerTitle}
                                onChange={(e) => setHeaderTitle(e.target.value)}
                            />
                            <p className="text-xs text-neutral-500 mt-1">Se usará el nombre de la carpeta si lo dejas vacío</p>
                        </div>

                        {/* Selector de Fuente */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-300 flex items-center gap-2">
                                Fuente
                                {planLimits?.lowResDownloads && (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Plan Free</span>
                                )}
                            </label>
                            <select
                                className={`w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none transition ${planLimits?.lowResDownloads ? 'opacity-50 cursor-not-allowed' : ''}`}
                                value={planLimits?.lowResDownloads ? "Inter" : headerFontFamily}
                                disabled={!!planLimits?.lowResDownloads}
                                onChange={(e) => setHeaderFontFamily(e.target.value)}
                            >
                                <option value="Inter">Inter (Profesional neutro)</option>
                                <option value="DM Sans">DM Sans (Moderno cercano)</option>
                                <option value="Fraunces">Fraunces (Editorial premium)</option>
                                <option value="Playfair Display">Playfair Display (Bodas clásicas)</option>
                                <option value="Cormorant">Cormorant (Artístico autoral)</option>
                                <option value="Allura">Allura (Romance / Boda)</option>
                            </select>
                            {planLimits?.lowResDownloads && (
                                <p className="text-xs text-neutral-500 mt-1">Personalización de fuentes disponible en planes Pro.</p>
                            )}
                            {planLimits?.lowResDownloads && (
                                <p className="text-xs text-neutral-500 mt-1">Personalización de fuentes disponible en planes Pro.</p>
                            )}
                        </div>

                        {/* Tamaño de Fuente (Slider) */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-neutral-300">Tamaño del Título</label>
                                <span className="text-xs text-neutral-500">{headerFontSize}%</span>
                            </div>
                            <input
                                type="range"
                                min="100"
                                max="500"
                                value={headerFontSize}
                                onChange={(e) => setHeaderFontSize(parseInt(e.target.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-700 accent-emerald-500"
                            />
                            <div className="flex justify-between text-[9px] text-neutral-500 mt-1">
                                <span>Normal</span>
                                <span>Gigante</span>
                            </div>
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
                    </div>

                    {/* Watermark Toggle */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableWatermark}
                                onChange={(e) => setEnableWatermark(e.target.checked)}
                                className="w-5 h-5 rounded accent-emerald-500"
                            />
                            <span className="text-sm font-medium text-neutral-300">Habilitar Marca de Agua</span>
                        </label>
                        <p className="text-xs text-neutral-500 mt-1 ml-8">Muestra tu logo superpuesto en las fotos para protección.</p>
                    </div>

                    {/* Photo Download Options */}
                    <div className="border-t border-neutral-800 pt-6 space-y-3">
                        <p className="text-sm font-medium text-neutral-300">Opciones de descarga de fotos</p>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={downloadJpgEnabled}
                                onChange={(e) => {
                                    // Always allow toggling, but if lowResDownloads is true, it means low res
                                    setDownloadJpgEnabled(e.target.checked);
                                }}
                                className="w-5 h-5 rounded accent-emerald-500"
                            />
                            <span className="text-sm text-neutral-300">
                                {planLimits?.lowResDownloads ? 'Permitir descargas JPG (Resolución Web)' : 'Permitir descargas JPG (Alta Resolución)'}
                            </span>
                            {planLimits?.lowResDownloads && (
                                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded ml-2">Plan Free</span>
                            )}
                        </label>
                        <label className={`flex items-center gap-3 ${planLimits?.lowResDownloads ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={planLimits?.lowResDownloads ? false : downloadRawEnabled}
                                onChange={(e) => {
                                    if (planLimits?.lowResDownloads) return;
                                    setDownloadRawEnabled(e.target.checked);
                                }}
                                disabled={!!planLimits?.lowResDownloads}
                                className="w-5 h-5 rounded accent-emerald-500 disabled:opacity-50"
                            />
                            <span className="text-sm text-neutral-300">Permitir descargas RAW</span>
                            {planLimits?.lowResDownloads && (
                                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded ml-2">Pro req.</span>
                            )}
                        </label>
                        {planLimits?.lowResDownloads && (
                            <p className="text-xs text-amber-400">Tu plan solo permite descargas en resolución web (1200px).</p>
                        )}
                        <p className="text-xs text-neutral-500">Los clientes podrán descargar fotos en diferentes calidades según tu configuración</p>
                    </div>

                    {/* Habilitar Videos */}
                    <div className="border-t border-neutral-800 pt-6">
                        <label className={`flex items-center gap-3 ${planLimits?.videoEnabled === false ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={enableVideoTab}
                                onChange={(e) => {
                                    if (planLimits?.videoEnabled === false) {
                                        alert('\u26a0\ufe0f Tu plan no incluye video\n\nActualiza tu plan para habilitar galer\u00edas de video.');
                                        return;
                                    }
                                    setEnableVideoTab(e.target.checked);
                                }}
                                disabled={planLimits?.videoEnabled === false}
                                className="w-5 h-5 rounded accent-emerald-500 disabled:opacity-50"
                            />
                            <span className="font-medium text-neutral-300">Habilitar tab de Videos</span>
                            {planLimits?.videoEnabled === false && (
                                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">Plan Free</span>
                            )}
                        </label>
                        {planLimits?.videoEnabled === false ? (
                            <p className="text-xs text-amber-400 mt-1 ml-8">Tu plan actual no incluye galer\u00edas de video. <a href="/pricing" className="underline">Actualizar plan</a></p>
                        ) : (
                            <p className="text-xs text-neutral-500 mt-1 ml-8">Agrega una pesta\u00f1a separada para videos</p>
                        )}
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
            )}

            {/* Saving State */}
            {
                step === "saving" && (
                    <div className="flex items-center gap-3 text-emerald-500 bg-emerald-950/20 border border-emerald-500/20 p-5 rounded-2xl">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Creando galería profesional...</span>
                    </div>
                )
            }

            {/* Folder Browser Modal */}
            {
                showBrowser && selectedAccount && (
                    <FolderBrowser
                        cloudAccountId={selectedAccount.id}
                        onSelect={handleFolderSelect}
                        onCancel={() => setShowBrowser(false)}
                    />
                )
            }

            {/* Video Folder Browser Modal */}
            {
                showVideoBrowser && selectedAccount && (
                    <FolderBrowser
                        cloudAccountId={selectedAccount.id}
                        onSelect={(folder) => {
                            setVideoFolder(folder);
                            setShowVideoBrowser(false);
                        }}
                        onCancel={() => setShowVideoBrowser(false)}
                    />
                )
            }
        </div >
    );
}
