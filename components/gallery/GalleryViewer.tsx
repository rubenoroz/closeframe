"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, Folder, Heart, Loader2, Maximize2, CheckCircle2, Circle, Download, X } from "lucide-react";
import Lightbox from "./Lightbox";
import { Skeleton } from "@/components/Skeleton";

interface Props {
    cloudAccountId: string;
    folderId: string;
    projectName?: string;
    downloadEnabled?: boolean;
    downloadJpgEnabled?: boolean;
    downloadRawEnabled?: boolean;
    studioName?: string;
    studioLogo?: string;
    studioLogoScale?: number;
    theme?: string;
    className?: string;
}

interface CloudFile {
    id: string;
    name: string;
    mimeType?: string;
    thumbnailLink?: string;
    width?: number;
    height?: number;
    formats?: {
        web: string;
        jpg?: string | null;
        hd?: string | null;
        raw?: string | { id: string; name: string } | null;
    };
}

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
    className = ""
}: Props) {
    const [files, setFiles] = useState<CloudFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const clearSelection = () => setSelectedIds(new Set());
    const selectAll = () => setSelectedIds(new Set(files.map(f => f.id)));

    // Distribution logic for masonry
    const columns = useMemo(() => {
        const cols: CloudFile[][] = [[], [], [], []];
        files.forEach((file, index) => {
            cols[index % 4].push(file);
        });
        return cols;
    }, [files]);

    const mobileColumns = useMemo(() => {
        const cols: CloudFile[][] = [[], []];
        files.forEach((file, index) => {
            cols[index % 2].push(file);
        });
        return cols;
    }, [files]);

    const openLightbox = (index: number) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

    const handleDownloadZip = async (format: "jpg" | "raw" = "jpg") => {
        if (selectedIds.size === 0) return;

        setIsDownloading(true);

        try {
            const selectedFiles = files.filter(f => selectedIds.has(f.id));

            // Preparar datos
            const filesData = selectedFiles.map(f => {
                let fileId = f.id;
                let fileName = f.name;

                if (format === "raw") {
                    const rawData = f.formats?.raw;
                    if (rawData && typeof rawData === 'object') {
                        fileId = rawData.id;
                        fileName = rawData.name; // Usar nombre real (.CR2, .NEF)
                    } else if (typeof rawData === 'string') {
                        fileId = rawData; // Legacy/Fallback
                    }
                    // Si no hay RAW, se usará el ID por defecto (f.id) que es el JPG/Web
                }
                else if (format === "jpg") {
                    fileId = f.formats?.jpg || f.id;
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
        fetch(`/api/cloud/files?cloudAccountId=${cloudAccountId}&folderId=${folderId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.files) {
                    setFiles(data.files);
                } else {
                    setError(data.error || "Error al cargar imágenes");
                }
                setLoading(false);
            })
            .catch((err) => {
                setError("Error de conexión");
                setLoading(false);
            });
    }, [cloudAccountId, folderId]);

    // Derived download state
    const anyDownloadEnabled = downloadEnabled && (downloadJpgEnabled || downloadRawEnabled);

    return (
        <div className={`min-h-screen transition-colors duration-700 ${theme === 'light' ? 'bg-neutral-50 text-neutral-900' : 'bg-neutral-900 text-neutral-100'} font-sans relative ${className}`}>
            {/* Top Bar */}
            <header className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-8 py-6 transition-all ${theme === 'light'
                ? 'bg-neutral-50/80 backdrop-blur-md border-b border-neutral-100'
                : 'bg-gradient-to-b from-black/80 to-transparent'
                } pointer-events-none`}>
                <div className="flex items-center gap-3 text-lg font-light pointer-events-auto">
                    {studioLogo ? (
                        <div
                            className="h-8 flex items-center justify-center overflow-hidden transition-transform duration-300 origin-left"
                            style={{ transform: `scale(${studioLogoScale / 100})` }}
                        >
                            <img src={studioLogo} alt={studioName} className="h-full w-auto object-contain max-w-none" />
                        </div>
                    ) : (
                        <Camera className={`w-5 h-5 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-500'}`} />
                    )}
                    <span className={`tracking-tight font-medium ${theme === 'light' ? 'text-neutral-900' : 'text-white'}`}>{studioName}</span>
                </div>
                <div className="flex items-center gap-3 pointer-events-auto">
                    {anyDownloadEnabled && selectedIds.size > 0 && (
                        <button
                            onClick={clearSelection}
                            className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Limpiar ({selectedIds.size})
                        </button>
                    )}
                    <span className={`text-sm tracking-tight backdrop-blur-md px-3 py-1 rounded-full border transition-colors ${theme === 'light'
                        ? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                        : 'bg-black/30 text-neutral-400 border-white/10'
                        }`}>
                        {projectName}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 md:px-8 pt-28 pb-32 min-h-screen">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <Skeleton key={i} className={`w-full rounded-xl ${i % 2 === 0 ? "h-64" : "h-48"}`} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col justify-center items-center py-40 text-red-400 gap-2">
                        <p>⚠️ {error}</p>
                        <p className="text-sm text-neutral-500">Verifica que el archivo exista en la nube.</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex justify-center items-center py-40 text-neutral-500">
                        Esta carpeta no contiene imágenes ni videos.
                    </div>
                ) : (
                    <>
                        <div className="hidden md:grid grid-cols-4 gap-4 items-start">
                            {columns.map((col, colIdx) => (
                                <div key={colIdx} className="flex flex-col gap-4">
                                    {col.map((item) => {
                                        const originalIndex = files.findIndex((f) => f.id === item.id);
                                        return (
                                            <MediaCard
                                                key={item.id}
                                                item={item}
                                                index={originalIndex}
                                                cloudAccountId={cloudAccountId}
                                                downloadEnabled={anyDownloadEnabled}
                                                isSelected={selectedIds.has(item.id)}
                                                onSelect={() => toggleSelect(item.id)}
                                                onView={() => openLightbox(originalIndex)}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        <div className="grid md:hidden grid-cols-2 gap-3 items-start">
                            {mobileColumns.map((col, colIdx) => (
                                <div key={colIdx} className="flex flex-col gap-3">
                                    {col.map((item) => {
                                        const originalIndex = files.findIndex((f) => f.id === item.id);
                                        return (
                                            <MediaCard
                                                key={item.id}
                                                item={item}
                                                index={originalIndex}
                                                cloudAccountId={cloudAccountId}
                                                downloadEnabled={anyDownloadEnabled}
                                                isSelected={selectedIds.has(item.id)}
                                                onSelect={() => toggleSelect(item.id)}
                                                onView={() => openLightbox(originalIndex)}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>

            {/* Lightbox - Pass permitted download types */}
            <Lightbox
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                files={files}
                currentIndex={currentIndex}
                onNavigate={(index) => setCurrentIndex(index)}
                cloudAccountId={cloudAccountId}
                downloadJpgEnabled={downloadEnabled && downloadJpgEnabled}
                downloadRawEnabled={downloadEnabled && downloadRawEnabled}
            />

            {/* Bottom Bar for Batch Download */}
            {anyDownloadEnabled && (
                <footer className={`fixed bottom-0 left-0 right-0 transition-all border-t px-8 py-4 flex items-center justify-between z-40 ${theme === 'light'
                    ? 'bg-white/90 backdrop-blur-xl border-neutral-100 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]'
                    : 'bg-neutral-900/90 backdrop-blur-xl border-neutral-800'
                    }`}>
                    <div className="flex items-center gap-4 text-sm">
                        <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            <Folder className="w-4 h-4" />
                            <span>{files.length} fotos</span>
                        </div>
                        {selectedIds.size > 0 && (
                            <span className="text-emerald-500 font-bold">
                                {selectedIds.size} seleccionadas
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
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
                        <div className="flex items-center gap-2">
                            {downloadJpgEnabled && (
                                <div className="relative group">
                                    <button
                                        disabled={selectedIds.size === 0 || isDownloading}
                                        className={`px-6 py-3 rounded-l-2xl border-r text-sm transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg ${
                                            // Handle border radius if only one button is present
                                            !downloadRawEnabled ? "rounded-r-2xl border-r-0" : ""
                                            } ${theme === 'light'
                                                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-200 border-emerald-700'
                                                : 'bg-white text-black hover:bg-neutral-200 border-neutral-200'
                                            }`}
                                        onClick={() => handleDownloadZip("jpg")}
                                    >
                                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                        Descargar Baja
                                    </button>
                                </div>
                            )}

                            {downloadRawEnabled && (
                                <button
                                    disabled={selectedIds.size === 0 || isDownloading}
                                    onClick={() => handleDownloadZip("raw")}
                                    className={`px-4 py-3 rounded-r-2xl text-sm transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg ${
                                        // Handle border radius if only RAW is present
                                        !downloadJpgEnabled ? "rounded-l-2xl" : ""
                                        } ${theme === 'light'
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-200'
                                            : 'bg-white text-black hover:bg-neutral-200'
                                        }`}
                                    title="Descargar Alta Calidad"
                                >
                                    <span className="text-xs font-black tracking-wider">ALTA</span>
                                </button>
                            )}
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}

function MediaCard({
    item,
    index,
    cloudAccountId,
    isSelected,
    downloadEnabled,
    onSelect,
    onView
}: {
    item: CloudFile;
    index: number;
    cloudAccountId: string;
    isSelected: boolean;
    downloadEnabled: boolean;
    onSelect: () => void;
    onView: () => void
}) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const isVideo = item.mimeType?.startsWith('video/');

    // Calculate aspect ratio for placeholder sizing (avoids layout shift)
    // Default to 4:3 if dimensions unknown
    const aspectRatio = (item.width && item.height)
        ? item.width / item.height
        : 4 / 3;

    // Use eager loading for first 8 items (likely in viewport)
    const loadingStrategy = index < 8 ? "eager" : "lazy";

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
                        src={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${item.id}&s=400`}
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
                </div>

                {/* Selection Checkbox */}
                {downloadEnabled && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                        className={cn(
                            "absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition-all duration-300 z-10 shadow-lg border",
                            isSelected
                                ? "bg-emerald-500 text-white border-emerald-400"
                                : "bg-black/40 text-white/60 border-white/10 opacity-0 group-hover:opacity-100"
                        )}
                    >
                        {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                )}

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
            </div>
        </motion.div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
