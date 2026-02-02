"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Folder, Loader2, AlertCircle, ArrowLeft, PlusCircle, Check, Mail, Zap, Info, Cloud, ChevronRight, Layout, Download, ImageIcon, Music } from "lucide-react";
import FolderBrowser from "@/components/FolderBrowser";
import GallerySettingsForm, { GallerySettingsData } from "@/components/gallery/GallerySettingsForm";
import Link from "next/link";
import Image from "next/image";

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

    // [NEW] Dynamically load fonts for preview
    useEffect(() => {
        const fonts = ["DM Sans", "Fraunces", "Playfair Display", "Cormorant", "Allura"];
        const linkId = "preview-fonts";
        if (!document.getElementById(linkId)) {
            const link = document.createElement("link");
            link.id = linkId;
            link.rel = "stylesheet";
            link.href = `https://fonts.googleapis.com/css2?family=${fonts.map(f => f.replace(/ /g, "+")).join("&family=")}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    }, []);

    const DEFAULT_DATA: GallerySettingsData = {
        name: "",
        headerTitle: "",
        headerFontFamily: "Inter",
        headerFontSize: 100,
        headerColor: "#FFFFFF",
        headerBackground: "dark",
        layoutType: "mosaic",
        headerImage: "",
        headerImageFocus: "50,50",
        coverImage: "",
        coverImageFocus: "50,50",
        isCloserGallery: false,
        musicTrackId: undefined,
        musicEnabled: false,
        enableWatermark: false,
        downloadEnabled: true,
        downloadJpgEnabled: true,
        downloadRawEnabled: false,
        enableVideoTab: false,
        downloadVideoHdEnabled: true,
        downloadVideoRawEnabled: false,
        zipFileId: "",
        zipFileName: ""
    };

    // Data to save
    const [selectedAccount, setSelectedAccount] = useState<CloudAccount | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
    const [formData, setFormData] = useState<GallerySettingsData>(DEFAULT_DATA);

    // Plan limits
    const [planLimits, setPlanLimits] = useState<{
        videoEnabled?: boolean;
        lowResDownloads?: boolean;
        galleryCover?: boolean;
    } | null>(null);

    useEffect(() => {
        fetch("/api/cloud/accounts")
            .then((res) => res.json())
            .then((data) => {
                const cloudAccounts = Array.isArray(data) ? data : (data.storage || data.accounts || []);
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
                        galleryCover: data.effectiveConfig.features?.galleryCover, // Check if this exists
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
        if (showBrowser) {
            setSelectedFolder(folder);
            setShowBrowser(false);
            setFormData(prev => ({
                ...prev,
                name: folder.name,
                headerTitle: folder.name
            }));
            setStep("header");
        }
    };

    // Helper for image picking (reusing ZipFilePicker logic but for images? No, types differ).
    // I'll rely on the user having to set specific images LATER if valid picker isn't available, 
    // OR create a simple file list picker for the selected folder. 
    // Let's implement a simple FilePicker modal inline if needed, or better, 
    // just let them pick the "Folder" and explain images are auto-selected or add a note.
    // Actually, looking at `dashboard/page.tsx`, it calls `setShowHeaderImagePicker(true)`.
    // I suspect there is a component or logic for it.
    // I will implement a basic `FilePicker` using similar logic to `ZipFilePicker` but for images.

    const handleCreateProject = async () => {
        if (!selectedAccount || !selectedFolder) return;

        setStep("saving");
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name || selectedFolder.name,
                    cloudAccountId: selectedAccount.id,
                    rootFolderId: selectedFolder.id,
                    headerTitle: formData.headerTitle || formData.name || selectedFolder.name,
                    headerFontFamily: formData.headerFontFamily,
                    headerFontSize: formData.headerFontSize,
                    headerColor: formData.headerColor,
                    headerBackground: formData.headerBackground,
                    enableWatermark: formData.enableWatermark,
                    downloadEnabled: formData.downloadEnabled,
                    downloadJpgEnabled: formData.downloadJpgEnabled,
                    downloadRawEnabled: formData.downloadRawEnabled,
                    enableVideoTab: formData.enableVideoTab,
                    videoFolderId: null, // Removed video folder picking in creation
                    downloadVideoHdEnabled: formData.downloadVideoHdEnabled,
                    downloadVideoRawEnabled: formData.downloadVideoRawEnabled,
                    // New Fields
                    category: formData.category,
                    layoutType: formData.layoutType,
                    headerImage: formData.headerImage,
                    headerImageFocus: formData.headerImageFocus,
                    coverImage: formData.coverImage,
                    coverImageFocus: formData.coverImageFocus,
                    musicTrackId: formData.musicTrackId,
                    musicEnabled: formData.musicEnabled,
                    isCloserGallery: formData.isCloserGallery,
                    zipFileId: formData.zipFileId,
                    zipFileName: formData.zipFileName,
                    date: formData.date,
                    password: formData.password
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
        <div className="max-w-4xl mx-auto py-6 md:py-10 px-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-neutral-500 hover:text-white mb-6 md:mb-8 transition text-xs md:text-sm">
                <ArrowLeft className="w-4 h-4" /> Volver al dashboard
            </Link>

            <h1 className="text-2xl md:text-3xl font-light mb-2">Nueva Galería</h1>
            <p className="text-neutral-400 mb-8 md:mb-10 text-xs md:text-sm">Configura tu galería profesional con todas las opciones.</p>

            {/* Step 1: Account Selection */}
            {step === "account" && (
                <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 md:gap-4 mb-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-white text-black rounded-full flex items-center justify-center text-base md:text-lg font-bold">1</div>
                        <h2 className="text-lg md:text-xl font-medium">Elige una cuenta de Nube</h2>
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
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl md:rounded-2xl p-5 md:p-8 max-w-2xl mx-auto">
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

            {/* Step 3: Full Configuration */}
            {step === "header" && selectedAccount && selectedFolder && (
                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold">3</div>
                            <div>
                                <p className="text-sm text-neutral-500">Configuración</p>
                                <h2 className="text-2xl font-light">Personaliza tu galería</h2>
                            </div>
                        </div>
                        <button
                            onClick={() => setStep("folder")}
                            className="text-sm text-neutral-500 hover:text-white transition"
                        >
                            Cambiar carpeta
                        </button>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 md:p-8 shadow-2xl">
                        <GallerySettingsForm
                            data={formData}
                            onChange={setFormData}
                            planLimits={planLimits}
                            projectId={undefined} // Creating mode
                            rootFolderId={selectedFolder.id}
                            cloudAccountId={selectedAccount.id}
                            isGoogleDrive={selectedAccount.provider === 'google'}
                            onSave={handleCreateProject}
                            saveLabel="Crear Galería"
                            onCancel={() => setStep("folder")}
                        />
                    </div>
                </div>
            )}

            {/* Saving State */}
            {
                step === "saving" && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4 text-emerald-500 bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <span className="font-medium text-lg text-white">Configurando tu galería...</span>
                        </div>
                    </div>
                )
            }

            {/* Modals */}
            {
                showBrowser && selectedAccount && (
                    <FolderBrowser
                        cloudAccountId={selectedAccount.id}
                        onSelect={handleFolderSelect}
                        onCancel={() => setShowBrowser(false)}
                    />
                )
            }


        </div >
    );
}
