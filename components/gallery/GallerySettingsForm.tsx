"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, Folder, Loader2, AlertCircle, ArrowLeft, PlusCircle, Check, Mail, Zap, Info, Cloud, ChevronRight, Layout, Download, ImageIcon, Music, Settings, X, Trash2, Sparkles, Copy, Calendar, Link as LinkIcon, Lock, Users } from "lucide-react";
import MusicPicker from "@/components/MusicPicker";
import FocalPointPicker from "@/components/FocalPointPicker";
import ZipFilePicker from "@/components/ZipFilePicker";
import DriveFilePicker from "@/components/DriveFilePicker";
import CollaborativeSettings from "@/components/gallery/CollaborativeSettings";
import { cn } from "@/lib/utils";

// Interface for the data structure managed by this form
// Matches the 'editData' state in dashboard/page.tsx
export interface GallerySettingsData {
    name: string;
    category?: string;

    slug?: string;
    password?: string | null;
    date?: string; // ISO date string or YYYY-MM-DD

    // Header & Design
    headerTitle: string;
    headerFontFamily: string;
    headerFontSize: number;
    headerColor: string;
    headerBackground: "dark" | "light";
    layoutType: "mosaic" | "grid";
    headerImage: string;
    headerImageFocus: string;

    // Features
    isCloserGallery: boolean;
    isCollaborative?: boolean; // New: Optional for creation
    moments?: string[]; // New: List of moment names to create folders for
    musicTrackId?: string; // Changed from string | null to string to match dashboard/page.tsx state
    musicEnabled: boolean;
    enableWatermark: boolean;

    // Downloads
    downloadEnabled: boolean;
    downloadJpgEnabled: boolean;
    downloadRawEnabled: boolean;
    enableVideoTab: boolean;
    downloadVideoHdEnabled: boolean;
    downloadVideoRawEnabled: boolean;
    zipFileId: string;
    zipFileName: string;

    // Cover
    coverImage?: string;
    coverImageFocus?: string;
}

export interface PlanLimits {
    allowedLowRes?: boolean;
    allowedHighRes?: boolean;
    videoEnabled?: boolean;
    galleryCover?: boolean;
    passwordProtection?: boolean;
    customFonts?: boolean;
    closerGalleries?: boolean;
    collaborativeGalleries?: boolean;
    zipDownloadsEnabled?: boolean;
}

interface GallerySettingsFormProps {
    data: GallerySettingsData;
    onChange: (newData: GallerySettingsData) => void;
    planLimits?: PlanLimits | null;

    // Context props
    projectId?: string; // If undefined, we are in "Create" mode (no collab settings yet)
    cloudAccountId?: string; // Needed for thumbnail generation
    rootFolderId?: string; // Needed for DriveFilePicker
    isGoogleDrive?: boolean; // For collab settings logic
    isLight?: boolean;

    // Actions
    onSave?: () => void;
    onCancel?: () => void; // Used for "Exit" or "Close Modal"
    isSaving?: boolean;
    saveLabel?: string;

    // UI Options
    className?: string;
    showDelete?: boolean; // Show delete gallery button (only for edit)
    onDelete?: () => void;
}

export default function GallerySettingsForm({
    data,
    onChange,
    planLimits,
    projectId,
    cloudAccountId,
    rootFolderId,
    isGoogleDrive = true,
    isLight = false,
    onSave,
    onCancel,
    isSaving = false,
    saveLabel = "Guardar Cambios",
    className,
    showDelete = false,
    onDelete
}: GallerySettingsFormProps) {
    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
    const [showHeaderImagePicker, setShowHeaderImagePicker] = useState(false);
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [showZipFilePicker, setShowZipFilePicker] = useState(false);

    // Handlers for updating a single field
    // [DEBUG] Check what limits are arriving
    useEffect(() => {
        console.log("--- GallerySettingsForm DEBUG ---");
        console.log("Plan Limits:", planLimits);
        console.log("Closer Enabled in Plan?", planLimits?.closerGalleries);
        console.log("Current Form Data isCloserGallery:", data.isCloserGallery);
    }, [planLimits, data.isCloserGallery]);

    const update = (field: keyof GallerySettingsData, value: any) => {
        let newData = { ...data, [field]: value };

        // Auto-sync Header Title if it was empty or matched the old name
        if (field === 'name') {
            if (!data.headerTitle || data.headerTitle === data.name) {
                newData.headerTitle = value;
            }
        }

        onChange(newData);
    };

    return (
        <div className={cn("space-y-8", className)}>

            {/* A - CLOSER GALLERY PREMIUM SECTION */}
            <div className={`p-5 rounded-2xl border-2 transition-all ${data.isCloserGallery
                ? "bg-neutral-900 border-emerald-500 shadow-xl shadow-emerald-900/10"
                : isLight ? "bg-neutral-50 border-neutral-100" : "bg-neutral-800/20 border-neutral-800"
                }`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.isCloserGallery ? "bg-emerald-500 text-white" : "bg-neutral-700 text-neutral-400"
                            }`}>
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={`font-medium ${data.isCloserGallery ? (isLight ? "text-neutral-900" : "text-white") : "text-neutral-500"}`}>
                                Experiencia Closer
                            </h3>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Galería Premium</p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={data.isCloserGallery}
                            disabled={!planLimits?.closerGalleries}
                            onChange={(e) => {
                                if (!planLimits?.closerGalleries) return;
                                update('isCloserGallery', e.target.checked);
                            }}
                        />
                        <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-50"></div>
                    </label>
                </div>

                {!planLimits?.closerGalleries && (
                    <div className="mt-2 text-[10px] text-amber-500 flex items-center gap-2 bg-amber-500/10 p-2 rounded-lg">
                        <AlertCircle className="w-3 h-3" />
                        La Experiencia Closer requiere un Plan Superior.
                    </div>
                )}

                {data.isCloserGallery && (
                    <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                        {/* Music Picker */}
                        <div>
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Música de Fondo</label>
                            <MusicPicker
                                selectedTrackId={data.musicTrackId || null}
                                onSelect={(id) => {
                                    const newData = { ...data, musicTrackId: id || "" };
                                    if (id) newData.musicEnabled = true;
                                    onChange(newData);
                                }}
                            />
                        </div>

                        {/* Autoplay Toggle */}
                        <div className="flex items-center gap-3 pl-1">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={data.musicEnabled}
                                    onChange={(e) => update('musicEnabled', e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                            <span className="text-xs text-neutral-400 font-medium">Reproducción automática</span>
                        </div>



                    </div>
                )}

                {!data.isCloserGallery && (
                    <p className="text-xs text-neutral-500 mt-2 pl-14">
                        Activa para habilitar navegación por momentos, música y diseño inmersivo.
                    </p>
                )}
            </div>

            {/* B - COLLABORATIVE GALLERY SECTION (Only for Closer Galleries) */}
            {/* Only show if we have a project ID (Edit Mode) */}
            {
                data.isCloserGallery && projectId && (
                    <div className={`p-5 rounded-2xl border-2 transition-all ${isLight ? "bg-neutral-50 border-neutral-100" : "bg-neutral-800/20 border-neutral-800"}`}>
                        <CollaborativeSettings
                            projectId={projectId}
                            isGoogleDrive={isGoogleDrive}
                        />
                    </div>
                )
            }
            {/* If Create Mode, show Collaborative option explicitly if Drive */}
            {
                data.isCloserGallery && !projectId && (
                    <div className={`rounded-2xl p-4 sm:p-6 border transition-all ${data.isCollaborative
                        ? "bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20"
                        : isLight ? "bg-neutral-50 border-neutral-100" : "bg-neutral-800/30 border-neutral-800"
                        }`}>

                        {/* Header - Matching CollaborativeSettings exactly */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${data.isCollaborative ? "bg-violet-500/20" : "bg-neutral-700/50"}`}>
                                    <Users className={`w-5 h-5 ${data.isCollaborative ? "text-violet-400" : "text-neutral-500"}`} />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-bold ${data.isCollaborative ? "bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60" : "text-neutral-500"}`}>
                                        Galería Colaborativa
                                    </h2>
                                    <p className={`${data.isCollaborative ? "text-violet-200/60" : "text-neutral-500"}`}>
                                        Deja que tus invitados suban fotos vía código QR
                                    </p>
                                </div>
                            </div>

                            {data.isCollaborative ? (
                                <button
                                    type="button"
                                    onClick={() => update('isCollaborative', false)}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                                >
                                    Desactivar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!planLimits?.collaborativeGalleries) return;
                                        update('isCollaborative', true);
                                    }}
                                    disabled={!isGoogleDrive || !planLimits?.collaborativeGalleries}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto"
                                >
                                    <Users className="w-4 h-4" />
                                    Activar Galería
                                </button>
                            )}
                        </div>

                        {!planLimits?.collaborativeGalleries && (
                            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 p-2 rounded-lg mb-4">
                                <AlertCircle className="w-4 h-4" />
                                Las Galerías Colaborativas requieren un Plan Superior.
                            </div>
                        )}

                        {!isGoogleDrive && (
                            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 p-2 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                Solo disponible con Google Drive.
                            </div>
                        )}


                        {data.isCollaborative && isGoogleDrive && (
                            <>
                                {/* Stats - Matching CollaborativeSettings */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <p className="text-slate-400 text-xs mb-1">Total Subidas</p>
                                        <p className="text-2xl font-bold text-white">0</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <p className="text-slate-400 text-xs mb-1">Secciones QR</p>
                                        <p className="text-2xl font-bold text-white">{data.moments?.length || 0}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <p className="text-slate-400 text-xs mb-1">Estado</p>
                                        <p className="text-lg font-medium text-emerald-400">Activo</p>
                                    </div>
                                </div>

                                {/* Sections - Matching CollaborativeSettings */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-white font-medium">Secciones QR</h4>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const name = prompt('Nombre de la sección (ej: Mesa 1, Zona VIP...)');
                                                if (name?.trim()) {
                                                    const current = data.moments || [];
                                                    update('moments', [...current, name.trim()]);
                                                }
                                            }}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white transition-colors"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            Agregar Sección
                                        </button>
                                    </div>

                                    {(!data.moments || data.moments.length === 0) ? (
                                        <div className="bg-white/5 rounded-xl p-6 text-center">
                                            <div className="w-8 h-8 text-slate-500 mx-auto mb-2 flex items-center justify-center">
                                                <UploadCloud className="w-8 h-8" />
                                            </div>
                                            <p className="text-slate-400 text-sm">No hay secciones aún. Crea una para generar un código QR.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {data.moments.map((section, idx) => (
                                                <div key={idx} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-violet-500/20 rounded-lg">
                                                            <Users className="w-4 h-4 text-violet-400" />
                                                        </div>
                                                        <p className="text-white font-medium">{section}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newMoments = data.moments?.filter((_, i) => i !== idx) || [];
                                                            update('moments', newMoments);
                                                        }}
                                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <X className="w-4 h-4 text-slate-400" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )
            }

            {/* General Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest mb-3 block opacity-40">Nombre de Galería</label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => update('name', e.target.value)}
                        className={`w-full border rounded-2xl px-6 py-4 outline-none transition-all ${isLight ? 'bg-neutral-50 border-neutral-100 focus:border-emerald-500' : 'bg-neutral-800 border-neutral-700 focus:border-emerald-500'}`}
                        required
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 opacity-100">
                        Categoría
                        {!planLimits?.allowedHighRes && (
                            <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded opacity-100">Plan Gratuito </span>
                        )}
                    </label>
                    <select
                        value={!planLimits?.allowedHighRes ? "personal" : data.category || ""}
                        disabled={!planLimits?.allowedHighRes}
                        onChange={(e) => update('category', e.target.value)}
                        className={`w-full border rounded-2xl px-6 py-4 outline-none transition-all ${isLight ? 'bg-neutral-50 border-neutral-100 focus:border-emerald-500' : 'bg-neutral-800 border-neutral-700 focus:border-emerald-500'} ${!planLimits?.allowedHighRes ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <option value="">Sin categoría</option>
                        <option value="editorial">📸 Editorial</option>
                        <option value="commercial">🛍️ Comercial</option>
                        <option value="wedding">💒 Bodas</option>
                        <option value="portrait">👤 Retrato</option>
                        <option value="fashion">👗 Moda</option>
                        <option value="test">🎭 Test / TFP</option>
                        <option value="personal">✨ Personal</option>
                    </select>
                </div>
            </div>

            {/* URL & Date - Only show slug if not creating (creating usually auto-generates, but user might want to edit?) */}
            {/* Dashboard page uses slug input. New page doesn't usually ask for slug. We'll show it if current slug exists or just name derived. */}
            <div className={`grid grid-cols-1 ${data.slug !== undefined ? 'md:grid-cols-2' : ''} gap-4`}>
                {data.slug !== undefined && (
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest mb-3 block opacity-40">URL Personalizada (Slug)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={data.slug || ""}
                                onChange={(e) => update('slug', e.target.value)}
                                className={`w-full border rounded-2xl pl-10 pr-4 py-4 outline-none transition-all ${isLight ? 'bg-neutral-50 border-neutral-100 focus:border-emerald-500' : 'bg-neutral-800 border-neutral-700 focus:border-emerald-500'}`}
                                placeholder="boda-ana-carlos"
                            />
                            <LinkIcon className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                )}
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest mb-3 block opacity-40">Fecha del Evento</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={data.date?.split("T")[0] || ""}
                            onChange={(e) => update('date', e.target.value)}
                            className={`w-full border rounded-2xl pl-10 pr-4 py-4 outline-none transition-all ${isLight ? 'bg-neutral-50 border-neutral-100 focus:border-emerald-500' : 'bg-neutral-800 border-neutral-700 focus:border-emerald-500'}`}
                        />
                        <Calendar className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>



            {/* Header Customization Section */}
            <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                <div className="flex items-center gap-3 mb-4">
                    <Layout className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">Personalización del Header</span>
                </div>

                <div className="space-y-4 pl-0 md:pl-7">
                    <div>
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Título del Header</label>
                        <input
                            type="text"
                            value={data.headerTitle}
                            onChange={(e) => update('headerTitle', e.target.value)}
                            placeholder={data.name || "Ej: Boda de Ana & Carlos"}
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${isLight ? 'bg-white border-neutral-200 focus:border-emerald-500' : 'bg-neutral-900 border-neutral-700 focus:border-emerald-500'}`}
                        />
                        <p className="text-[10px] text-neutral-500 mt-1.5 ml-1">
                            Se sincroniza automáticamente con el "Nombre de Galería" a menos que escribas algo diferente aquí.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                Tipografía
                                {!planLimits?.customFonts && (
                                    <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Requiere Pro</span>
                                )}
                            </label>
                            {/* Custom Font Selector */}
                            <div className="relative">
                                <button
                                    type="button"
                                    disabled={!planLimits?.customFonts}
                                    onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                                    className={`w-full text-left border rounded-xl px-4 py-2.5 text-sm transition-all flex items-center justify-between ${isLight ? 'bg-white border-neutral-200 hover:border-emerald-500' : 'bg-neutral-900 border-neutral-700 hover:border-emerald-500'
                                        } ${!planLimits?.customFonts ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    style={{
                                        fontFamily: data.headerFontFamily !== "Inter" ? `'${data.headerFontFamily}', sans-serif` : "inherit"
                                    }}
                                >
                                    <span>
                                        {data.headerFontFamily === "Inter" && "Inter (Profesional)"}
                                        {data.headerFontFamily === "DM Sans" && "DM Sans (Moderno)"}
                                        {data.headerFontFamily === "Fraunces" && "Fraunces (Editorial)"}
                                        {data.headerFontFamily === "Playfair Display" && "Playfair (Bodas)"}
                                        {data.headerFontFamily === "Cormorant" && "Cormorant (Artístico)"}
                                        {data.headerFontFamily === "Allura" && "Allura (Romance)"}
                                    </span>
                                    <ChevronRight className={`w-4 h-4 opacity-50 transition-transform ${isFontDropdownOpen ? 'rotate-[-90deg]' : 'rotate-90'}`} />
                                </button>

                                {/* Dropdown */}
                                {planLimits?.customFonts && (
                                    <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl overflow-hidden z-[60] p-1 transition-all ${isFontDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'} ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'}`}>
                                        {[
                                            { val: "Inter", label: "Inter (Profesional)", font: "Inter, sans-serif" },
                                            { val: "DM Sans", label: "DM Sans (Moderno)", font: "DM Sans, sans-serif" },
                                            { val: "Fraunces", label: "Fraunces (Editorial)", font: "Fraunces, serif" },
                                            { val: "Playfair Display", label: "Playfair (Bodas)", font: "Playfair Display, serif" },
                                            { val: "Cormorant", label: "Cormorant (Artístico)", font: "Cormorant, serif" },
                                            { val: "Allura", label: "Allura (Romance)", font: "Allura, cursive" }
                                        ].map((opt) => (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => {
                                                    update('headerFontFamily', opt.val);
                                                    setIsFontDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${data.headerFontFamily === opt.val
                                                    ? (isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400')
                                                    : (isLight ? 'hover:bg-neutral-50' : 'hover:bg-white/5')
                                                    }`}
                                                style={{ fontFamily: opt.font }}
                                            >
                                                <span className="text-base">{opt.label.split('(')[0]}</span>
                                                <span className="text-xs opacity-50 relative top-[1px]">{opt.label.split('(')[1]?.replace(')', '')}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Font Preview Block */}
                            <div
                                className={`mt-3 p-4 rounded-xl border text-center transition-all min-h-[60px] flex items-center justify-center ${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-white/5 border-white/5'}`}
                                style={{
                                    fontFamily: data.headerFontFamily !== "Inter" ? `'${data.headerFontFamily}', sans-serif` : "inherit",
                                    color: data.headerColor,
                                    fontSize: `${Math.max(14, 1.2 * (data.headerFontSize / 100) * 16)}px`,
                                    lineHeight: '1.2'
                                }}
                            >
                                {data.headerTitle || "Vista Previa del Texto"}
                            </div>
                        </div>

                        {/* Font Size & Color */}
                        <div>
                            <div>
                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span>Tamaño del Texto</span>
                                    <span className="text-neutral-400">{data.headerFontSize}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="100"
                                    max="500"
                                    value={data.headerFontSize}
                                    onChange={(e) => update('headerFontSize', parseInt(e.target.value))}
                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isLight ? 'bg-neutral-200 accent-neutral-900' : 'bg-neutral-700 accent-white'}`}
                                />
                                <div className="flex justify-between text-[9px] text-neutral-500 mt-1">
                                    <span>Normal</span>
                                    <span>Gigante</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Color del Texto</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={data.headerColor}
                                        onChange={(e) => update('headerColor', e.target.value)}
                                        className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={data.headerColor}
                                        onChange={(e) => update('headerColor', e.target.value)}
                                        className={`flex-1 border rounded-xl px-3 py-2 text-sm font-mono outline-none transition-all ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-700'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {planLimits?.galleryCover && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                                Imagen de Portada (Splash Screen)
                            </label>
                            {data.coverImage && (
                                <button
                                    type="button"
                                    onClick={() => update('coverImage', "")}
                                    className="text-[10px] text-red-500 hover:text-red-400 font-medium"
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                        {data.coverImage ? (
                            <div className="space-y-3">
                                <div className="w-full h-64 rounded-xl overflow-hidden relative border border-neutral-700/50 group">
                                    <FocalPointPicker
                                        imageUrl={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${data.coverImage}&s=800`}
                                        value={data.coverImageFocus || "50,50"}
                                        onChange={(value) => update('coverImageFocus', value)}
                                        className="w-full h-full"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCoverPicker(true)}
                                    className="text-xs text-neutral-400 hover:text-white transition"
                                >
                                    Cambiar imagen
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowCoverPicker(true)}
                                className="w-full h-24 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-xl flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs">Seleccionar imagen de Drive</span>
                            </button>
                        )}
                        {/* Cover Picker Modal would go here - for now reusing structure */}
                    </div>
                )}

                <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Tema de Fondo</label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => update('headerBackground', "dark")}
                            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${data.headerBackground === "dark"
                                ? "bg-neutral-900 text-white border-2 border-emerald-500"
                                : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600"
                                }`}
                        >
                            🌙 Oscuro
                        </button>
                        <button
                            type="button"
                            onClick={() => update('headerBackground', "light")}
                            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${data.headerBackground === "light"
                                ? "bg-white text-black border-2 border-emerald-500"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200 hover:border-neutral-300"
                                }`}
                        >
                            ☀️ Claro
                        </button>
                    </div>
                </div>

                {/* Layout */}
                <div className="mt-6">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Diseño de la Galería</label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => update('layoutType', "mosaic")}
                            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${data.layoutType === "mosaic"
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                : isLight ? "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300" : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600"
                                }`}
                        >
                            🧩 Mosaico
                        </button>
                        <button
                            type="button"
                            onClick={() => update('layoutType', "grid")}
                            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${data.layoutType === "grid"
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                : isLight ? "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300" : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600"
                                }`}
                        >
                            🔳 Cuadrícula
                        </button>
                    </div>
                    {data.layoutType === "mosaic" && (
                        <div className="mt-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-200/80 leading-relaxed">
                                <strong className="text-amber-500">Importante:</strong> Para que este diseño funcione correctamente, las imágenes deben contener metadata original (ancho/alto).
                            </p>
                        </div>
                    )}
                </div>

                {/* Header BG Image */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                            Imagen de Fondo del Header
                        </label>
                        {data.headerImage && (
                            <button
                                type="button"
                                onClick={() => update('headerImage', "")}
                                className="text-[10px] text-red-500 hover:text-red-400 font-medium"
                            >
                                Eliminar
                            </button>
                        )}
                    </div>
                    {data.headerImage ? (
                        <div className="space-y-3">
                            <div className="w-full h-32 rounded-xl overflow-hidden relative border border-neutral-700/50 group">
                                <FocalPointPicker
                                    imageUrl={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${data.headerImage}&s=800`}
                                    value={data.headerImageFocus || "50,50"}
                                    onChange={(value) => update('headerImageFocus', value)}
                                    className="w-full h-full"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHeaderImagePicker(true)}
                                className="text-xs text-neutral-400 hover:text-white transition"
                            >
                                Cambiar imagen
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowHeaderImagePicker(true)}
                            className="w-full h-20 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-xl flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4" />
                            </div>
                            <span className="text-xs">Seleccionar imagen de Drive</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Downloads & Video */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border md:col-span-2`}>
                    <div className="flex items-center gap-3 mb-4">
                        <Download className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium">Permisos de Descarga</span>
                    </div>

                    <div className="space-y-3 pl-0 md:pl-7">
                        {(planLimits?.allowedLowRes || planLimits?.allowedHighRes) ? (
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className={`text-sm ${data.downloadEnabled ? (isLight ? 'text-neutral-900' : 'text-white') : 'text-neutral-500'}`}>Activar Descargas</span>
                                <input
                                    type="checkbox"
                                    checked={data.downloadEnabled}
                                    onChange={(e) => update('downloadEnabled', e.target.checked)}
                                    className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                />
                            </label>
                        ) : (
                            <div className="p-3 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-neutral-500 text-xs flex items-center gap-3">
                                <Lock className="w-4 h-4 text-neutral-600" />
                                <span>Las descargas no están incluidas en tu plan actual.</span>
                            </div>
                        )}

                        {data.downloadEnabled && (planLimits?.allowedLowRes || planLimits?.allowedHighRes) && (
                            <div className={`animate-in slide-in-from-top-2 fade-in duration-300 space-y-3 pt-2 border-t border-dashed ${isLight ? 'border-neutral-200' : 'border-neutral-700/50'}`}>
                                {/* JPG */}
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="flex flex-col">
                                        <span className={`text-sm hover:opacity-100 transition-colors ${isLight ? 'text-neutral-600 hover:text-black' : 'text-neutral-400 hover:text-white'}`}>
                                            {planLimits?.allowedHighRes ? 'JPG (Alta Resolución)' : 'JPG (Resolución Web)'}
                                            {!planLimits?.allowedHighRes && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">Plan Gratuito</span>}
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={data.downloadJpgEnabled}
                                        onChange={(e) => update('downloadJpgEnabled', e.target.checked)}
                                        className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                    />
                                </label>
                                {/* RAW */}
                                <label className={`flex items-center justify-between ${!planLimits?.allowedHighRes ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} group`}>
                                    <div className="flex flex-col">
                                        <span className={`text-sm hover:opacity-100 transition-colors ${isLight ? 'text-neutral-600 hover:text-black' : 'text-neutral-400 hover:text-white'}`}>
                                            Archivos RAW
                                            {!planLimits?.allowedHighRes && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">Requiere Pro</span>}
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={!planLimits?.allowedHighRes ? false : data.downloadRawEnabled}
                                        disabled={!planLimits?.allowedHighRes}
                                        onChange={(e) => {
                                            if (!planLimits?.allowedHighRes) return;
                                            update('downloadRawEnabled', e.target.checked);
                                        }}
                                        className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700 disabled:opacity-50"
                                    />
                                </label>

                                {/* Video Tab */}
                                <div className={`mt-4 pt-4 border-t ${isLight ? 'border-neutral-200' : 'border-neutral-700/50'}`}>
                                    <label className="flex items-center justify-between cursor-pointer group mb-3">
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-medium hover:opacity-100 transition-colors ${isLight ? 'text-neutral-700 hover:text-black' : 'text-neutral-300 hover:text-white'}`}>Mostrar pestaña de Videos</span>
                                            {planLimits?.videoEnabled === false ? (
                                                <span className="text-[9px] text-amber-400">Tu plan no incluye video.</span>
                                            ) : (
                                                <span className="text-[9px] text-neutral-500">Habilita la pestaña de video.</span>
                                            )}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={data.enableVideoTab}
                                            disabled={!planLimits?.videoEnabled}
                                            onChange={(e) => {
                                                if (!planLimits?.videoEnabled) return;
                                                update('enableVideoTab', e.target.checked);
                                            }}
                                            className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700 disabled:opacity-50"
                                        />
                                    </label>
                                    {data.enableVideoTab && (
                                        <>
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Descargas de Video</span>
                                            <div className="space-y-3">
                                                <label className="flex items-center justify-between cursor-pointer group">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">HD (1080p)</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={data.downloadVideoHdEnabled}
                                                        onChange={(e) => update('downloadVideoHdEnabled', e.target.checked)}
                                                        className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                    />
                                                </label>
                                                <label className="flex items-center justify-between cursor-pointer group">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">Alta Calidad (4K/ProRes)</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={data.downloadVideoRawEnabled}
                                                        onChange={(e) => update('downloadVideoRawEnabled', e.target.checked)}
                                                        className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                    />
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ZIP */}
                <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border md:col-span-2`}>
                    <div className="flex items-center gap-3 mb-4">
                        <Download className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Archivo ZIP de Descarga</span>
                    </div>
                    <div className="space-y-3 pl-0 md:pl-7">
                        {planLimits?.zipDownloadsEnabled ? (
                            <>
                                <p className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                    Vincula un archivo ZIP de tu Google Drive.
                                </p>
                                {data.zipFileId ? (
                                    <div className="flex items-center gap-3">
                                        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl ${isLight ? 'bg-white border border-neutral-200' : 'bg-neutral-900 border border-neutral-700'}`}>
                                            <Download className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm truncate">{data.zipFileName || 'Archivo seleccionado'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowZipFilePicker(true)}
                                            className="text-xs text-neutral-400 hover:text-white transition"
                                        >
                                            Cambiar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onChange({ ...data, zipFileId: '', zipFileName: '' })}
                                            className="text-xs text-red-400 hover:text-red-300 transition"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowZipFilePicker(true)}
                                        className={`w-full py-3 px-4 border border-dashed rounded-xl flex items-center justify-center gap-2 transition-colors ${isLight
                                            ? 'border-neutral-300 hover:border-blue-400 text-neutral-500 hover:text-blue-600 hover:bg-blue-50'
                                            : 'border-neutral-700 hover:border-blue-500 text-neutral-400 hover:text-blue-400 hover:bg-blue-500/5'
                                            }`}
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="text-sm">Seleccionar archivo ZIP de Drive</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="p-3 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/50 text-neutral-500 text-xs flex items-center gap-3">
                                <Lock className="w-4 h-4 text-neutral-600" />
                                <span>Las descargas ZIP requieren un Plan Superior.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Watermark & Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                    {/* Password Protection (Moved here) */}
                    <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Lock className="w-4 h-4 text-neutral-400" />
                                <div className="flex flex-col">
                                    <span className="text-sm">Galería Privada</span>
                                    <span className="text-[10px] text-neutral-500">Protege el acceso con contraseña.</span>
                                </div>
                            </div>

                            {/* Toggle */}
                            {planLimits?.passwordProtection && (
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={data.password !== null && data.password !== undefined}
                                        onChange={(e) => {
                                            update('password', e.target.checked ? "" : null);
                                        }}
                                    />
                                    <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            )}
                        </div>

                        {planLimits?.passwordProtection && (data.password !== null && data.password !== undefined) && (
                            <div className="relative mt-3 animate-in fade-in slide-in-from-top-2">
                                <input
                                    type="text"
                                    value={data.password || ""}
                                    onChange={(e) => update('password', e.target.value)}
                                    placeholder="Escribe la contraseña..."
                                    className={`w-full border rounded-xl pl-9 pr-4 py-2 text-sm outline-none transition-all ${isLight
                                        ? 'bg-white border-neutral-200 focus:border-emerald-500'
                                        : 'bg-neutral-900 border-neutral-700/50 focus:border-emerald-500'
                                        }`}
                                />
                                <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        )}

                        {!planLimits?.passwordProtection && (
                            <div className="mt-2 text-[10px] text-amber-500 flex items-center gap-2 bg-amber-500/10 p-2 rounded-lg">
                                <AlertCircle className="w-3 h-3" />
                                Requiere Plan PRO.
                            </div>
                        )}
                    </div>

                    {/* Watermark */}
                    <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                        <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-neutral-400" />
                                <div className="flex flex-col">
                                    <span className="text-sm">Marca de Agua</span>
                                    <span className="text-[10px] text-neutral-500">Simulada. En plan gratuito se añade logo.</span>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={data.enableWatermark}
                                onChange={(e) => update('enableWatermark', e.target.checked)}
                                className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-800">
                {showDelete && onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="mr-auto px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-medium transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition font-medium"
                    >
                        Cancelar
                    </button>
                )}

                {onSave && (
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saveLabel}
                    </button>
                )}
            </div>

            {/* PICKERS MODALS */}
            {
                cloudAccountId && rootFolderId && (
                    <>
                        {/* Header Image Picker */}
                        {showHeaderImagePicker && (
                            <DriveFilePicker
                                cloudAccountId={cloudAccountId}
                                folderId={rootFolderId}
                                selectedFileId={data.headerImage || null}
                                onSelect={(fileId) => {
                                    update('headerImage', fileId);
                                    setShowHeaderImagePicker(false);
                                }}
                                onCancel={() => setShowHeaderImagePicker(false)}
                            />
                        )}

                        {/* Cover Image Picker */}
                        {showCoverPicker && (
                            <DriveFilePicker
                                cloudAccountId={cloudAccountId}
                                folderId={rootFolderId}
                                selectedFileId={data.coverImage || null}
                                onSelect={(fileId) => {
                                    update('coverImage', fileId);
                                    setShowCoverPicker(false);
                                }}
                                onCancel={() => setShowCoverPicker(false)}
                            />
                        )}

                        {/* Zip File Picker */}
                        {showZipFilePicker && (
                            <ZipFilePicker
                                cloudAccountId={cloudAccountId}
                                folderId={rootFolderId}
                                selectedFileId={data.zipFileId || null}
                                onSelect={(fileId, fileName) => {
                                    update('zipFileId', fileId);
                                    update('zipFileName', fileName);
                                    setShowZipFilePicker(false);
                                }}
                                onCancel={() => setShowZipFilePicker(false)}
                            />
                        )}
                    </>
                )
            }
        </div >
    );
}
