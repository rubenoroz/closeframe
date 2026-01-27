"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, Folder, Heart, Loader2, Maximize2, CheckCircle2, Circle, Download, X } from "lucide-react";
import Lightbox from "./Lightbox";
import { Skeleton } from "@/components/Skeleton";
import GalleryLoaderGrid from "./GalleryLoaderGrid";

import { CloudFile } from "@/types/cloud";

interface Props {
    cloudAccountId: string;
    folderId: string;
    projectId?: string;
    projectName?: string;
    downloadEnabled?: boolean;
    downloadJpgEnabled?: boolean;
    downloadRawEnabled?: boolean;
    studioName?: string;
    studioLogo?: string;
    studioLogoScale?: number;
    theme?: string;
    className?: string;
    mediaType?: "photos" | "videos";
    enableWatermark?: boolean;
    maxImages?: number | null;
    watermarkText?: string | null;
    lowResDownloads?: boolean;
    lowResThumbnails?: boolean;
    zipDownloadsEnabled?: boolean | "static_only"; // [UPDATED]
}

// ... CloudFile interface ...

export default function GalleryViewer({
    cloudAccountId,
    folderId,
    projectName = "Galería",
    downloadEnabled = true,
    downloadJpgEnabled = true,
    downloadRawEnabled = false,
    studioName = "Closeframe",
    studioLogo = "",
    studioLogoScale = 100,
    theme = "dark",
    className = "",
    mediaType = "photos",
    enableWatermark = false,
    maxImages = null,
    watermarkText = null,
    lowResDownloads = false,
    lowResThumbnails = false,
    zipDownloadsEnabled = true
}: Props) {
    const [files, setFiles] = useState<CloudFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);

    // [NEW] Separate media content from static ZIP resources
    const mediaFiles = useMemo(() => {
        return files.filter(f => !f.mimeType?.includes('zip') && !f.name.endsWith('.zip'));
    }, [files]);

    // [NEW] Find static gallery ZIP
    const staticZipFile = useMemo(() => {
        return files.find(f =>
            (f.mimeType?.includes('zip') || f.name.endsWith('.zip')) &&
            (f.name.toLowerCase().includes('full') || f.name.toLowerCase().includes('gallery') || f.name.toLowerCase().includes('todo'))
        );
    }, [files]);

    const toggleSelect = useCallback((id: string) => {
        // [NEW] Prevent selection if ZIP downloads are disabled or static only
        if (zipDownloadsEnabled === false || zipDownloadsEnabled === 'static_only') return;

        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, [zipDownloadsEnabled]);

    const clearSelection = () => setSelectedIds(new Set());
    // [Updated] Only select from VISIBLE media files
    const selectAll = () => setSelectedIds(new Set(mediaFiles.map(f => f.id)));

    // Distribution logic for masonry using mediaFiles
    const columns = useMemo(() => {
        const cols: CloudFile[][] = [[], [], [], []];
        mediaFiles.forEach((file, index) => {
            cols[index % 4].push(file);
        });
        return cols;
    }, [mediaFiles]);

    const mobileColumns = useMemo(() => {
        const cols: CloudFile[][] = [[], []];
        mediaFiles.forEach((file, index) => {
            cols[index % 2].push(file);
        });
        return cols;
    }, [mediaFiles]);

    const openLightbox = (index: number) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

    const handleDownloadStaticZip = () => {
        if (!staticZipFile) return;
        // Direct download using the direct download route (which now redirects properly)
        // We use download-direct for individual files, but we can use it for the ZIP too.
        // Or simply redirect to the webContentLink if available.
        // Actually, our download-direct route handles redirects now.
        window.location.href = `/api/cloud/download-direct?c=${cloudAccountId}&f=${staticZipFile.id}&n=${encodeURIComponent(staticZipFile.name)}`;
    };

    const handleDownloadZip = async (format: "jpg" | "raw" = "jpg") => {
        if (selectedIds.size === 0) return;

        setIsDownloading(true);

        try {
            const selectedFiles = mediaFiles.filter(f => selectedIds.has(f.id));

            // Preparar datos
            const filesData = selectedFiles.map(f => {
                let fileId = f.id;
                let fileName = f.name;
                const isVideo = f.mimeType?.startsWith('video/');

                if (format === "raw") {
                    const rawData = f.formats?.raw;
                    if (rawData && typeof rawData === 'object') {
                        fileId = rawData.id;
                        fileName = rawData.name; // Usar nombre real (.CR2, .NEF, .mov)
                    } else if (typeof rawData === 'string') {
                        fileId = rawData; // Legacy/Fallback
                    }
                    // Si no hay RAW/Alta, se usará el ID por defecto (f.id) que es el Web
                }
                else if (format === "jpg") {
                    // For videos, use HD format; for photos, use JPG format
                    if (isVideo) {
                        fileId = f.formats?.hd || f.id;
                    } else {
                        fileId = f.formats?.jpg || f.id;
                    }
                }

                return { id: fileId, name: fileName };
            });

            // Nombre seguro para la URL
            const safeProjectName = projectName ? projectName.replace(/[^a-zA-Z0-9]/g, "_") : "Galeria";
            const timestamp = new Date().getTime();
            const filename = `${safeProjectName}_${format.toUpperCase()}_${timestamp}.zip`;

            console.log("Iniciando descarga Batch:", filename);
            const params = new URLSearchParams();
            params.append("c", cloudAccountId);
            params.append("f", JSON.stringify(filesData));

            // Add size param if low res restriction is active
            if (lowResDownloads) {
                params.append("s", "1200"); // Or use lowResMaxWidth if available in props
            }

            const finalEndpoint = `/api/cloud/dl/${filename}?${params.toString()}`;

            let fileHandle: any = null;
            let writable: any = null;

            // 1. Intentar obtener handle de archivo PRIMERO
            try {
                // @ts-ignore
                if (window.showSaveFilePicker) {
                    // @ts-ignore
                    fileHandle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'ZIP Archive',
                            accept: { 'application/zip': ['.zip'] },
                        }],
                    });
                    writable = await fileHandle.createWritable();
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    setIsDownloading(false);
                    return;
                }
                console.warn("FS API no disponible o falló:", err);
            }

            // 2. Fetch
            const response = await fetch(finalEndpoint);
            if (!response.ok) throw new Error("Error en la descarga del servidor");

            // 3a. Streaming write
            if (writable) {
                console.log("Streaming batch a disco...");
                if (response.body) {
                    // @ts-ignore
                    await response.body.pipeTo(writable);
                } else {
                    await writable.write(await response.blob());
                    await writable.close();
                }
                console.log("Stream batch completado.");
                setIsDownloading(false);
                return;
            }

            // 3b. Fallback
            console.log("Usando Fallback Batch...");
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
                setIsDownloading(false);
            }, 2000);

        } catch (err: any) {
            console.error(err);
            alert("Hubo un error al iniciar la descarga: " + err.message);
            setIsDownloading(false);
        }
    };

    useEffect(() => {
        if (!cloudAccountId || !folderId) return;

        setLoading(true);
        console.log("[GalleryViewer] Loading files, maxImages limit:", maxImages);
        fetch(`/api/cloud/files?cloudAccountId=${cloudAccountId}&folderId=${folderId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.files) {
                    console.log("[GalleryViewer] Received files:", data.files.length);
                    // Apply max images limit if set
                    const limitedFiles = maxImages && maxImages > 0
                        ? data.files.slice(0, maxImages)
                        : data.files;
                    console.log("[GalleryViewer] After limit applied:", limitedFiles.length);
                    setFiles(limitedFiles);
                } else {
                    setError(data.error || "Error al cargar imágenes");
                }
                setLoading(false);
            })
            .catch((err) => {
                setError("Error de conexión");
                setLoading(false);
            });
    }, [cloudAccountId, folderId, maxImages]);

    // Derived download state
    const anyDownloadEnabled = downloadEnabled && (downloadJpgEnabled || downloadRawEnabled);
    // [NEW] Logic for dynamic ZIPs availability
    const dynamicZipEnabled = anyDownloadEnabled && zipDownloadsEnabled === true;
    // [NEW] Logic for static ZIP availability
    const staticZipAvailable = anyDownloadEnabled && zipDownloadsEnabled === 'static_only' && !!staticZipFile;

    return (
        <div className={`min-h-screen transition-colors duration-700 ${theme === 'light' ? 'bg-neutral-50 text-neutral-900' : 'bg-neutral-900 text-neutral-100'} font-sans relative ${className}`}>
            {/* Top Bar */}
            <header className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-8 py-6 transition-all ${theme === 'light'
                ? 'bg-neutral-50/80 backdrop-blur-md border-b border-neutral-100'
                : 'bg-gradient-to-b from-black/80 to-transparent'
                } pointer-events-none`}>
                <div className="flex items-center gap-3 text-lg font-light pointer-events-auto">
                    {/* ... Logo/Name ... */}
                    {studioLogo ? (
                        <div
                            className="h-8 flex items-center justify-center overflow-hidden transition-transform duration-300 origin-left"
                            style={{ transform: `scale(${studioLogoScale / 100})` }}
                        >
                            <img src={studioLogo} alt={studioName} className="h-full w-auto object-contain max-w-none" />
                        </div>
                    ) : (
                        <>
                            <Camera className={`w-5 h-5 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-500'}`} />
                            <span className={`tracking-tight font-medium ${theme === 'light' ? 'text-neutral-900' : 'text-white'}`}>{studioName}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3 pointer-events-auto">
                    {/* Clear selection only if dynamic zip enabled */}
                    {dynamicZipEnabled && selectedIds.size > 0 && (
                        <button
                            onClick={clearSelection}
                            className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Limpiar ({selectedIds.size})
                        </button>
                    )}
                    {/* [NEW] Strategic Download All Button for Pro users in Header */}
                    {staticZipAvailable && (
                        <button
                            onClick={handleDownloadStaticZip}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 shadow-lg ${theme === 'light'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-200'
                                : 'bg-white text-black hover:bg-neutral-200'
                                }`}
                        >
                            <Download className="w-3 h-3" />
                            <span>Descargar Todo</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 md:px-8 pt-28 pb-32 min-h-screen">
                {loading ? (
                    <GalleryLoaderGrid theme={theme} />
                ) : error ? (
                    <div className="flex flex-col justify-center items-center py-40 text-red-400 gap-2">
                        <p>⚠️ {error}</p>
                        <p className="text-sm text-neutral-500">Verifica que el archivo exista en la nube.</p>
                    </div>
                ) : mediaFiles.length === 0 ? (
                    <div className="flex justify-center items-center py-40 text-neutral-500">
                        {mediaType === "videos"
                            ? "Esta carpeta no contiene videos."
                            : "Esta carpeta no contiene imágenes."}
                    </div>
                ) : (
                    <>
                        {/* Desktop Grid */}
                        <div className="hidden md:grid grid-cols-4 gap-1 items-start">
                            {columns.map((col, colIdx) => (
                                <div key={colIdx} className="flex flex-col gap-1">
                                    {col.map((item) => {
                                        const originalIndex = mediaFiles.findIndex((f) => f.id === item.id);
                                        return (
                                            <MediaCard
                                                key={item.id}
                                                item={item}
                                                index={originalIndex}
                                                cloudAccountId={cloudAccountId}
                                                downloadEnabled={anyDownloadEnabled}
                                                // Disable selection if not dynamic zip enabled
                                                selectionEnabled={dynamicZipEnabled}
                                                enableWatermark={enableWatermark}
                                                watermarkText={watermarkText}
                                                studioLogo={studioLogo}
                                                isSelected={selectedIds.has(item.id)}
                                                onSelect={() => toggleSelect(item.id)}
                                                onView={() => openLightbox(originalIndex)}
                                                lowResThumbnails={lowResThumbnails}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        {/* Mobile Grid */}
                        <div className="grid md:hidden grid-cols-2 gap-1 items-start">
                            {mobileColumns.map((col, colIdx) => (
                                <div key={colIdx} className="flex flex-col gap-1">
                                    {col.map((item) => {
                                        const originalIndex = mediaFiles.findIndex((f) => f.id === item.id);
                                        return (
                                            <MediaCard
                                                key={item.id}
                                                item={item}
                                                index={originalIndex}
                                                cloudAccountId={cloudAccountId}
                                                downloadEnabled={anyDownloadEnabled}
                                                selectionEnabled={dynamicZipEnabled}
                                                enableWatermark={enableWatermark}
                                                watermarkText={watermarkText}
                                                studioLogo={studioLogo}
                                                isSelected={selectedIds.has(item.id)}
                                                onSelect={() => toggleSelect(item.id)}
                                                onView={() => openLightbox(originalIndex)}
                                                lowResThumbnails={lowResThumbnails}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </>
                )
                }
            </main >

            {/* Lightbox */}
            < Lightbox
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                files={mediaFiles} // Only show media files
                currentIndex={currentIndex}
                onNavigate={(index) => setCurrentIndex(index)}
                cloudAccountId={cloudAccountId}
                downloadJpgEnabled={downloadEnabled && downloadJpgEnabled}
                downloadRawEnabled={downloadEnabled && downloadRawEnabled}
                enableWatermark={enableWatermark}
                studioLogo={studioLogo}
                watermarkText={watermarkText}
                lowResDownloads={lowResDownloads}
            />

            {/* Bottom Bar for Batch Download (Only if Dynamic ZIP is Enabled) */}
            {
                dynamicZipEnabled && (
                    <footer className={`fixed bottom-0 left-0 right-0 transition-all border-t px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0 z-40 ${theme === 'light'
                        ? 'bg-white/90 backdrop-blur-xl border-neutral-100 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]'
                        : 'bg-neutral-900/90 backdrop-blur-xl border-neutral-800'
                        }`}>
                        <div className="flex items-center justify-between md:justify-start gap-4 text-sm">
                            <div className={`hidden md:flex items-center gap-2 ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                <Folder className="w-4 h-4" />
                                <span>{mediaFiles.length} {mediaType === "videos" ? "videos" : "fotos"}</span>
                            </div>
                            {selectedIds.size > 0 && (
                                <span className="text-emerald-500 font-bold text-xs md:text-sm">
                                    {selectedIds.size} seleccionadas
                                </span>
                            )}
                            {/* Mobile selection buttons */}
                            <div className="md:hidden">
                                {selectedIds.size === 0 ? (
                                    <button
                                        onClick={selectAll}
                                        className={`text-xs transition font-medium ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}
                                    >
                                        Seleccionar todas
                                    </button>
                                ) : (
                                    <button
                                        onClick={clearSelection}
                                        className={`text-xs transition font-medium ${theme === 'light' ? 'text-neutral-400' : 'text-neutral-400'}`}
                                    >
                                        Desmarcar
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 md:gap-6">
                            {/* Desktop selection buttons */}
                            <div className="hidden md:block">
                                {selectedIds.size === 0 ? (
                                    <button
                                        onClick={selectAll}
                                        className={`text-sm transition font-medium ${theme === 'light' ? 'text-neutral-500 hover:text-black' : 'text-neutral-400 hover:text-white'}`}
                                    >
                                        Seleccionar todas
                                    </button>
                                ) : (
                                    <button
                                        onClick={clearSelection}
                                        className={`text-sm transition font-medium ${theme === 'light' ? 'text-neutral-400 hover:text-red-500' : 'text-neutral-400 hover:text-white'}`}
                                    >
                                        Desmarcar todas
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-1 md:flex-none">
                                {downloadJpgEnabled && (
                                    <div className="relative group flex-1 md:flex-none">
                                        <button
                                            disabled={selectedIds.size === 0 || isDownloading}
                                            className={`w-full md:w-auto px-4 md:px-6 py-2.5 md:py-3 rounded-l-xl md:rounded-l-2xl border-r text-xs md:text-sm transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${!downloadRawEnabled ? "rounded-r-xl md:rounded-r-2xl border-r-0" : ""
                                                } ${theme === 'light'
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-200 border-emerald-700'
                                                    : 'bg-white text-black hover:bg-neutral-200 border-neutral-200'
                                                }`}
                                            onClick={() => handleDownloadZip("jpg")}
                                        >
                                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                            <span className="hidden sm:inline">{mediaType === "videos" ? "Descargar HD" : "Descargar JPG"}</span>
                                            <span className="sm:hidden">{mediaType === "videos" ? "HD" : "JPG"}</span>
                                        </button>
                                    </div>
                                )}

                                {downloadRawEnabled && (
                                    <button
                                        disabled={selectedIds.size === 0 || isDownloading}
                                        onClick={() => handleDownloadZip("raw")}
                                        className={`px-3 md:px-4 py-2.5 md:py-3 rounded-r-xl md:rounded-r-2xl text-xs md:text-sm transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg ${!downloadJpgEnabled ? "rounded-l-xl md:rounded-l-2xl" : ""
                                            } ${theme === 'light'
                                                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-200'
                                                : 'bg-white text-black hover:bg-neutral-200'
                                            }`}
                                        title={mediaType === "videos" ? "Descargar Alta Calidad" : "Descargar RAW"}
                                    >
                                        <span className="text-xs font-black tracking-wider">{mediaType === "videos" ? "ALTA" : "RAW"}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </footer>
                )
            }
        </div >
    );
}

function MediaCard({
    item,
    index,
    cloudAccountId,
    isSelected,
    downloadEnabled,
    enableWatermark,
    watermarkText,
    studioLogo,
    onSelect,
    onView,
    selectionEnabled = true,
    lowResThumbnails = false
}: {
    item: CloudFile;
    index: number;
    cloudAccountId: string;
    isSelected: boolean;
    downloadEnabled: boolean;
    enableWatermark: boolean;
    watermarkText: string | null;
    studioLogo: string;
    onSelect: () => void;
    onView: () => void;
    selectionEnabled?: boolean;
    lowResThumbnails?: boolean;
}) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const isVideo = item.mimeType?.startsWith('video/');

    // Determine thumbnail size based on plan limits
    const thumbSize = lowResThumbnails ? 200 : 800;

    // Calculate aspect ratio for placeholder sizing (avoids layout shift)
    // Default to 4:3 if dimensions unknown
    const aspectRatio = (item.width && item.height)
        ? item.width / item.height
        : 4 / 3;

    // Use eager loading for first 8 items (likely in viewport)
    const loadingStrategy = index < 8 ? "eager" : "lazy";

    // Debug logging for selection visibility
    // useEffect(() => {
    //    if (index === 0) console.log("MediaCard[0] props:", { downloadEnabled, selectionEnabled, isSelected });
    // }, [downloadEnabled, selectionEnabled, isSelected, index]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: (index % 10) * 0.05 }}
            className={`relative w-full rounded-xl bg-neutral-800 overflow-hidden cursor-pointer group border-2 transition-all duration-300 ${isSelected ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "border-transparent"
                }`}
        >
            <div
                className="relative"
                style={{ aspectRatio: aspectRatio }}
            >
                <div onClick={onView} className="absolute inset-0">
                    {/* Skeleton placeholder with shimmer effect */}
                    {!loaded && !error && (
                        <div className="absolute inset-0 bg-neutral-800 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 animate-pulse" />
                            {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-neutral-700/50 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-neutral-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                            <span className="text-neutral-500 text-xs">Error</span>
                        </div>
                    )}

                    <img
                        src={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${item.id}&s=${thumbSize}&t=${encodeURIComponent(item.thumbnailLink || '')}&v=2`}
                        alt={item.name}
                        className={`absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
                        onLoad={() => setLoaded(true)}
                        onError={() => setError(true)}
                        referrerPolicy="no-referrer"
                        loading={loadingStrategy}
                    />

                    {/* Video play icon overlay */}
                    {isVideo && loaded && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-xl">
                                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* Watermark overlay */}
                    {enableWatermark && loaded && !isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="opacity-30 max-w-[40%] max-h-[40%]">
                                <img
                                    src={studioLogo || "/favicon-white.svg"}
                                    alt="Watermark"
                                    className="w-full h-full object-contain drop-shadow-lg"
                                    style={{ filter: 'opacity(0.6)' }}
                                />
                            </div>
                        </div>
                    )}
                </div>



                {/* Overlay Actions (Hover) */}
                <div
                    onClick={onView}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center pointer-events-none"
                >
                    <div className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white transition shadow-xl border border-white/20">
                        <Maximize2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none">
                    <span className="text-xs text-neutral-200 truncate block">{item.name}</span>
                </div>

                {/* Selection Checkbox - Moved to end for stacking context safe-guard */}
                {downloadEnabled && selectionEnabled && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                        className={cn(
                            "absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition-all duration-300 z-50 shadow-lg border",
                            isSelected
                                ? "bg-emerald-500 text-white border-emerald-400 opacity-100 scale-100"
                                : "bg-black/40 text-white/80 border-white/20 opacity-100 scale-100 hover:bg-black/60"
                        )}
                        style={{ opacity: 1 }} // Always force visibility
                    >
                        {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                )}
            </div>
        </motion.div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
