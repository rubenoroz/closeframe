"use client";

import React, { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, Share2, Loader2 } from "lucide-react";

interface CloudFile {
    id: string;
    name: string;
    mimeType?: string;
    thumbnailLink?: string;
    formats?: {
        web: string;
        jpg?: string | null;
        hd?: string | null;
        raw?: string | { id: string; name: string } | null;
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
    enableWatermark?: boolean;
    studioLogo?: string;
    watermarkText?: string | null;
    lowResDownloads?: boolean;
    lowResMaxWidth?: number;
}

export default function Lightbox({
    isOpen,
    onClose,
    files,
    currentIndex,
    onNavigate,
    cloudAccountId,
    downloadJpgEnabled = true,
    downloadRawEnabled = false,
    enableWatermark = false,
    studioLogo = "",
    watermarkText = null,
    lowResDownloads = false,
    lowResMaxWidth = 1200
}: LightboxProps) {
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const currentFile = files[currentIndex];

    const handleNext = useCallback(() => {
        onNavigate((currentIndex + 1) % files.length);
    }, [currentIndex, files.length, onNavigate]);

    const handlePrev = useCallback(() => {
        onNavigate((currentIndex - 1 + files.length) % files.length);
    }, [currentIndex, files.length, onNavigate]);

    const handleDownloadFormat = async (format: "jpg" | "hd" | "raw") => {
        let fileId: string | undefined;
        let fileName = currentFile.name;

        const formatData = currentFile.formats?.[format];

        // Handle case where specific format proxy is missing
        if (!formatData) {
            // If Low Res restriction is ON and we want JPG, we can use the main file ID as source
            // logic downstream will use /api/cloud/thumbnail which works with Main ID too.
            if (lowResDownloads && format === 'jpg') {
                fileId = currentFile.id;
            } else {
                return;
            }
        } else if (format === 'raw' && typeof formatData === 'object' && formatData !== null) {
            fileId = formatData.id;
            fileName = formatData.name;
        } else if (typeof formatData === 'string') {
            fileId = formatData;
        }

        if (!fileId || !cloudAccountId) return;

        setIsDownloading(format);

        try {
            let directUrl: string;

            // Handle Low Res Downloads for JPG
            // Handle Low Res Downloads for JPG via Proxy (handles Auth & Resizing)
            if (lowResDownloads && format === 'jpg') {
                const size = lowResMaxWidth || 1200;
                directUrl = `/api/cloud/thumbnail?c=${cloudAccountId}&f=${fileId}&s=${size}`;
            } else {
                // Use direct download API (no ZIP compression for single files)
                const params = new URLSearchParams();
                params.append("c", cloudAccountId);
                params.append("f", fileId);
                params.append("n", fileName);
                directUrl = `/api/cloud/download-direct?${params.toString()}`;
            }

            let fileHandle: any = null;
            let writable: any = null;

            // Try File System Access API for better UX
            try {
                // @ts-ignore
                if (window.showSaveFilePicker) {
                    // @ts-ignore
                    fileHandle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                    });
                    writable = await fileHandle.createWritable();
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    setIsDownloading(null);
                    return;
                }
            }

            const res = await fetch(directUrl);
            if (!res.ok) throw new Error("Error download: " + res.status);

            if (writable && res.body) {
                // @ts-ignore
                await res.body.pipeTo(writable);
            } else {
                // Fallback: blob download
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                }, 2000);
            }
        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
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
                        {/* For photos: JPG button, For videos: Baja (hd) button */}
                        {downloadJpgEnabled && (currentFile.formats?.jpg || currentFile.formats?.hd) && (
                            <button
                                onClick={() => handleDownloadFormat(currentFile.mimeType?.startsWith('video/') ? "hd" : "jpg")}
                                disabled={!!isDownloading}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-emerald-500 text-white transition backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                            >
                                {(isDownloading === "jpg" || isDownloading === "hd") ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                {currentFile.mimeType?.startsWith('video/') ? 'HD' : 'JPG Alta Res'}
                            </button>
                        )}
                        {/* For photos: RAW button, For videos: Alta button */}
                        {downloadRawEnabled && currentFile.formats?.raw && (
                            <button
                                onClick={() => handleDownloadFormat("raw")}
                                disabled={!!isDownloading}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-orange-500 text-white transition backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                            >
                                {isDownloading === "raw" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                {currentFile.mimeType?.startsWith('video/') ? 'Alta' : 'RAW'}
                            </button>
                        )}
                        <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition backdrop-blur-md border border-white/10 text-sm font-medium">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Media Container - Video or Image */}
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-full h-full p-4 md:p-12 flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {currentFile.mimeType?.startsWith('video/') ? (
                            <video
                                key={`video-${currentFile.id}`}
                                controls
                                autoPlay
                                playsInline
                                poster={currentFile.thumbnailLink?.replace("=s220", `=s${lowResDownloads ? 1200 : 1600}`)}
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/5"
                                src={`/api/cloud/video-stream?c=${cloudAccountId}&f=${currentFile.formats?.web || currentFile.id}`}
                            >
                                Tu navegador no soporta la reproducción de video.
                            </video>
                        ) : (
                            <div className="relative max-w-full max-h-full flex items-center justify-center group">
                                <img
                                    src={currentFile.thumbnailLink?.replace("=s220", `=s${lowResDownloads ? 1200 : 1600}`)}
                                    alt={currentFile.name}
                                    className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg border border-white/5"
                                    referrerPolicy="no-referrer"
                                />
                                {/* Download overlay for images */}
                                {downloadJpgEnabled && (
                                    <div className="absolute bottom-4 right-4 flex bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition duration-300 rounded-full border border-white/20 overflow-hidden backdrop-blur-md">
                                        <button
                                            onClick={() => handleDownloadFormat("jpg")}
                                            disabled={isDownloading !== null}
                                            className="px-5 py-2 hover:bg-white hover:text-black transition flex items-center gap-2 border-r border-white/20 last:border-0"
                                        >
                                            {isDownloading === "jpg" ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                            <span className="text-sm font-medium">{lowResDownloads ? 'Baja (Web)' : 'Alta'}</span>
                                        </button>
                                    </div>
                                )}
                                {/* Watermark overlay */}
                                {enableWatermark && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        {studioLogo ? (
                                            <div className="opacity-25 max-w-[30%] max-h-[30%]">
                                                <img
                                                    src={studioLogo}
                                                    alt=""
                                                    className="w-full h-full object-contain drop-shadow-lg"
                                                    style={{ filter: 'grayscale(100%) brightness(200%) contrast(100%)' }}
                                                />
                                            </div>
                                        ) : watermarkText ? (
                                            <div className="text-white/30 font-bold text-2xl md:text-4xl tracking-widest uppercase drop-shadow-lg select-none"
                                                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                                {watermarkText}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        )}
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
