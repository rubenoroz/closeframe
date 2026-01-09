"use client";

import React, { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, Share2, Loader2 } from "lucide-react";

interface CloudFile {
    id: string;
    name: string;
    thumbnailLink?: string;
    formats?: {
        web: string;
        jpg: string | null;
        raw: string | { id: string; name: string } | null;
    };
}

interface LightboxProps {
    isOpen: boolean;
    onClose: () => void;
    files: CloudFile[];
    currentIndex: number;
    onNavigate: (index: number) => void;
    cloudAccountId?: string;
    downloadJpgEnabled?: boolean;
    downloadRawEnabled?: boolean;
}

export default function Lightbox({
    isOpen,
    onClose,
    files,
    currentIndex,
    onNavigate,
    cloudAccountId,
    downloadJpgEnabled = true,
    downloadRawEnabled = false
}: LightboxProps) {
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const currentFile = files[currentIndex];

    const handleNext = useCallback(() => {
        onNavigate((currentIndex + 1) % files.length);
    }, [currentIndex, files.length, onNavigate]);

    const handlePrev = useCallback(() => {
        onNavigate((currentIndex - 1 + files.length) % files.length);
    }, [currentIndex, files.length, onNavigate]);

    const handleDownloadFormat = async (format: "jpg" | "raw") => {
        let fileId: string | undefined;
        let fileName = currentFile.name; // Default filename (usually JPG name)

        const formatData = currentFile.formats?.[format];

        if (!formatData) return;

        if (format === 'raw' && typeof formatData === 'object' && formatData !== null) {
            fileId = formatData.id;
            fileName = formatData.name; // Use the REAL raw filename (e.g. .CR2, .NEF)
        } else if (typeof formatData === 'string') {
            fileId = formatData;
            // If it's a string ID, we keep currentFile.name (legacy behavior)
        }

        if (!fileId || !cloudAccountId) return;

        setIsDownloading(format);

        // Clean base name for the ZIP filename (e.g. from "Photo.jpg" -> "Photo")
        // We use currentFile.name as the base source of truth for the visual representation
        const cleanName = currentFile.name.replace(/\.[^/.]+$/, "");
        const timestamp = new Date().getTime();
        const zipFilename = `${cleanName}_${format.toUpperCase()}_${timestamp}.zip`;

        // Datos para backend: Aquí es clave pasar el fileName correcto (con extensión RAW si aplica)
        const filesData = [{ id: fileId, name: fileName }];

        const params = new URLSearchParams();
        params.append("c", cloudAccountId);
        params.append("f", JSON.stringify(filesData));
        const finalEndpoint = `/api/cloud/dl/${zipFilename}?${params.toString()}`;

        try {
            console.log("Iniciando proceso descarga Stream:", zipFilename);

            let fileHandle: any = null;
            let writable: any = null;

            // 1. Intentar obtener handle de archivo PRIMERO (Interacción usuario inmediata)
            try {
                // @ts-ignore
                if (window.showSaveFilePicker) {
                    // @ts-ignore
                    fileHandle = await window.showSaveFilePicker({
                        suggestedName: zipFilename,
                        types: [{
                            description: 'ZIP Archive',
                            accept: { 'application/zip': ['.zip'] },
                        }],
                    });
                    writable = await fileHandle.createWritable();
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    setIsDownloading(null);
                    return; // Usuario canceló diálogo
                }
                console.warn("FS API no disponible o falló:", err);
            }

            // 2. Iniciar descarga del servidor
            const res = await fetch(finalEndpoint);
            if (!res.ok) throw new Error("Error server download: " + res.status);

            // 3a. Si tenemos writable, usamos PipeTo (Stream directo al disco)
            if (writable) {
                console.log("Escribiendo stream a disco...");
                if (res.body) {
                    // @ts-ignore
                    await res.body.pipeTo(writable);
                } else {
                    await writable.write(await res.blob());
                    await writable.close();
                }
                console.log("Stream completado.");
                setIsDownloading(null);
                return;
            }

            // 3b. Fallback Clásico (Fetch -> Blob -> Link)
            console.log("Usando Fallback Clásico...");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = zipFilename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setIsDownloading(null);
            }, 2000);

        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
            setIsDownloading(null);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, handleNext, handlePrev, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm select-none">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-[110] p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition backdrop-blur-md border border-white/10"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Navigation Controls */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-8 z-[110] pointer-events-none">
                        <button
                            onClick={handlePrev}
                            className="p-4 rounded-full bg-white/5 hover:bg-white text-white hover:text-black transition backdrop-blur-md border border-white/10 pointer-events-auto shadow-2xl"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="p-4 rounded-full bg-white/5 hover:bg-white text-white hover:text-black transition backdrop-blur-md border border-white/10 pointer-events-auto shadow-2xl"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </div>

                    {/* Top Actions: Proxy/Format Downloads */}
                    <div className="absolute top-6 left-6 flex items-center gap-3 z-[110]">
                        {downloadJpgEnabled && currentFile.formats?.jpg && (
                            <button
                                onClick={() => handleDownloadFormat("jpg")}
                                disabled={!!isDownloading}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-emerald-500 text-white transition backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                            >
                                {isDownloading === "jpg" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                JPG Alta Res
                            </button>
                        )}
                        {downloadRawEnabled && currentFile.formats?.raw && (
                            <button
                                onClick={() => handleDownloadFormat("raw")}
                                disabled={!!isDownloading}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-orange-500 text-white transition backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                            >
                                {isDownloading === "raw" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                RAW
                            </button>
                        )}
                        <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition backdrop-blur-md border border-white/10 text-sm font-medium">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Image Container */}
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-full h-full p-4 md:p-12 flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={currentFile.thumbnailLink?.replace("=s220", "=s1600")}
                            alt={currentFile.name}
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/5"
                            referrerPolicy="no-referrer"
                        />
                    </motion.div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center gap-2 text-center max-w-lg px-4">
                        <h3 className="text-white text-sm font-light tracking-wide truncate w-full">
                            {currentFile.name}
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-neutral-500 text-[10px] uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {currentIndex + 1} / {files.length}
                            </span>
                            {currentFile.formats?.raw && (
                                <span className={`text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded border ${downloadRawEnabled
                                        ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
                                        : "text-neutral-500 bg-neutral-800 border-neutral-700 opacity-50"
                                    }`}>
                                    RAW {downloadRawEnabled ? "Disponible" : "Protegido"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
