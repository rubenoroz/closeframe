"use client";

import React, { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, Share2, Loader2, Play, Pause, Music as MusicIcon, Volume2 } from "lucide-react";

import { CloudFile } from "@/types/cloud";

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
    onVideoPlay?: () => void;
    onVideoPause?: () => void;
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
    lowResMaxWidth = 1200,
    onVideoPlay,
    onVideoPause
}: LightboxProps) {
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [audioIsPlaying, setAudioIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const currentFile = files[currentIndex];

    const [origin, setOrigin] = useState("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    const isVideo = currentFile.mimeType?.startsWith('video/') || currentFile.isExternal;
    const isAudio = currentFile.mimeType?.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg|flac)/i.test(currentFile.name);

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
            // Fallback to main ID for JPG downloads if format data is missing
            // This ensures download works for OneDrive/Generic files where formats might be empty
            if (format === 'jpg') {
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

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (audioIsPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;
        const time = (parseFloat(e.target.value) / 100) * audioDuration;
        audioRef.current.currentTime = time;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!isOpen) return;

        // Reset state
        setAudioIsPlaying(false);
        setAudioProgress(0);

        if (isVideo || isAudio) {
            onVideoPlay?.();
            // Important: Small delay to ensure audio element is ready
            if (isAudio && audioRef.current) {
                audioRef.current.currentTime = 0;
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.log("Autoplay blocked", e));
                }
            }
        } else {
            onVideoPause?.();
        }
    }, [currentIndex, isOpen, isVideo, isAudio, onVideoPlay, onVideoPause]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "Escape") {
                onVideoPause?.();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, handleNext, handlePrev, onClose, onVideoPause]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm select-none">
                    {/* Close button */}
                    <button
                        onClick={() => {
                            onVideoPause?.();
                            onClose();
                        }}
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
                        {/* Always show Download button if enabled, falling back to main ID if needed */}
                        {downloadJpgEnabled && (
                            <button
                                onClick={() => handleDownloadFormat(currentFile.mimeType?.startsWith('video/') ? "hd" : "jpg")}
                                disabled={!!isDownloading}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-emerald-500 text-white transition backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                            >
                                {(isDownloading === "jpg" || isDownloading === "hd") ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                Descargar
                            </button>
                        )}
                        {/* For photos: RAW button, For videos: Alta button */}
                        {downloadRawEnabled && currentFile.formats?.raw && (
                            <button
                                onClick={() => handleDownloadFormat("raw")}
                                disabled={!!isDownloading}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                            >
                                {isDownloading === "raw" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                {isVideo ? 'Alta Res' : 'Original RAW'}
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
                        {currentFile.isExternal ? (
                            <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-white/10">
                                <iframe
                                    src={
                                        currentFile.provider === 'vimeo'
                                            ? `https://player.vimeo.com/video/${currentFile.externalId}?autoplay=1&title=0&byline=0&portrait=0`
                                            : `https://www.youtube.com/embed/${currentFile.externalId}?autoplay=1&rel=0`
                                    }
                                    className="w-full h-full"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                    title={currentFile.name}
                                />
                            </div>
                        ) : currentFile.mimeType?.startsWith('video/') ? (
                            <video
                                key={`video-${currentFile.id}`}
                                controls
                                autoPlay
                                playsInline
                                poster={currentFile.thumbnailLink
                                    ? currentFile.thumbnailLink.replace("=s220", `=s${lowResDownloads ? 1200 : 1600}`)
                                    : `/api/cloud/thumbnail?c=${cloudAccountId}&f=${currentFile.id}&s=${lowResDownloads ? 1200 : 1600}`
                                }
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/5"
                                src={`/api/cloud/video-stream?c=${cloudAccountId}&f=${currentFile.formats?.web || currentFile.id}`}
                                onPlay={() => onVideoPlay?.()}
                                onPause={() => onVideoPause?.()}
                                onEnded={() => onVideoPause?.()}
                            >
                                Tu navegador no soporta la reproducción de video.
                            </video>
                        ) : isAudio ? (
                            <div className="w-full max-w-lg bg-black/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 text-center shadow-[0_64px_128px_rgba(0,0,0,0.9)] flex flex-col items-center">
                                {/* Beautiful Audio UI */}
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-[2rem] flex items-center justify-center mb-6 relative group"
                                >
                                    <div className="absolute inset-0 bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all rounded-[2rem]" />
                                    <MusicIcon className="w-10 h-10 text-emerald-400 relative z-10" />
                                    {audioIsPlaying && (
                                        <div className="absolute -bottom-2 flex gap-1 items-end h-8">
                                            {[0.4, 0.7, 1, 0.6, 0.8].map((h, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: ["20%", "100%", "20%"] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                                                    className="w-1 bg-emerald-400/60 rounded-full"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>

                                <h3 className="text-xl font-light text-white mb-2 line-clamp-1 italic">{currentFile.name}</h3>
                                <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-medium mb-8">Studio Master Quality</p>

                                {/* Custom controls */}
                                <div className="w-full space-y-6">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-mono text-white/40 w-10 text-right">{formatTime((audioProgress / 100) * audioDuration)}</span>
                                        <div className="relative flex-1 h-1.5 group cursor-pointer">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={audioProgress}
                                                onChange={handleAudioSeek}
                                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                            />
                                            <div className="absolute inset-0 bg-white/5 rounded-full" />
                                            <motion.div
                                                className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                                                style={{ width: `${audioProgress}%` }}
                                            />
                                            <motion.div
                                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                style={{ left: `${audioProgress}%`, marginLeft: '-6px' }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-white/40 w-10 text-left">{formatTime(audioDuration)}</span>
                                    </div>

                                    <div className="flex items-center justify-center gap-8">
                                        <button
                                            onClick={toggleAudio}
                                            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xl"
                                        >
                                            {audioIsPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
                                        </button>
                                    </div>
                                </div>

                                <audio
                                    ref={audioRef}
                                    className="hidden"
                                    autoPlay
                                    src={`/api/cloud/video-stream?c=${cloudAccountId}&f=${currentFile.id}`}
                                    onPlay={() => {
                                        setAudioIsPlaying(true);
                                        onVideoPlay?.();
                                    }}
                                    onPlaying={() => {
                                        setAudioIsPlaying(true);
                                        onVideoPlay?.();
                                    }}
                                    onPause={() => {
                                        setAudioIsPlaying(false);
                                        onVideoPause?.();
                                    }}
                                    onEnded={() => {
                                        setAudioIsPlaying(false);
                                        onVideoPause?.();
                                    }}
                                    onDurationChange={(e) => setAudioDuration(e.currentTarget.duration)}
                                    onTimeUpdate={(e) => {
                                        const cur = e.currentTarget.currentTime;
                                        const dur = e.currentTarget.duration;
                                        if (dur > 0) setAudioProgress((cur / dur) * 100);
                                    }}
                                />
                            </div>
                        ) : (
                            /* Check for PDF/Office Document */
                            (() => {
                                const ext = currentFile.name.split('.').pop()?.toLowerCase();
                                const isPdf = ext === 'pdf' || currentFile.mimeType === 'application/pdf';
                                // Office docs need Google Docs Viewer
                                const isWord = ['doc', 'docx'].includes(ext || '') || currentFile.mimeType?.includes('word');
                                const isExcel = ['xls', 'xlsx', 'csv'].includes(ext || '') || currentFile.mimeType?.includes('spreadsheet') || currentFile.mimeType?.includes('excel');
                                const isPpt = ['ppt', 'pptx'].includes(ext || '') || currentFile.mimeType?.includes('presentation') || currentFile.mimeType?.includes('powerpoint');

                                const isOffice = isWord || isExcel || isPpt;

                                if (isPdf) {
                                    // Native PDF Viewer via Proxy (No Google Auth required)
                                    // We use our own backend to stream the file content with inline disposition
                                    const params = new URLSearchParams();
                                    params.append("c", cloudAccountId || "");
                                    params.append("f", currentFile.id);
                                    params.append("n", currentFile.name);
                                    params.append("inline", "true");

                                    const pdfSrc = `/api/cloud/download-direct?${params.toString()}`;

                                    return (
                                        <div className="w-full h-full max-w-6xl flex flex-col bg-white rounded-lg overflow-hidden shadow-2xl">
                                            <iframe
                                                src={pdfSrc}
                                                className="w-full h-full min-h-[80vh]"
                                                title={currentFile.name}
                                            />
                                        </div>
                                    );
                                }

                                if (isOffice) {
                                    // Google Docs Viewer - needs a publicly accessible URL.
                                    // We use our proxy so it works even if the file is private in Drive/OneDrive/Box/etc.

                                    if (origin) {
                                        const params = new URLSearchParams();
                                        params.append("c", cloudAccountId || "");
                                        params.append("f", currentFile.id);
                                        params.append("n", currentFile.name);

                                        const proxyUrl = `${origin}/api/cloud/download-direct?${params.toString()}`;
                                        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(proxyUrl)}&embedded=true`;

                                        return (
                                            <div className="w-full h-full max-w-6xl flex flex-col bg-white rounded-lg overflow-hidden shadow-2xl">
                                                <iframe
                                                    src={viewerUrl}
                                                    className="w-full h-full min-h-[80vh]"
                                                    title={currentFile.name}
                                                />
                                            </div>
                                        );
                                    }
                                    return null; // Wait for origin
                                }

                                // Default Image Fallback
                                return (
                                    <div className="relative max-w-full max-h-full flex items-center justify-center group">
                                        <img
                                            src={currentFile.thumbnailLink
                                                ? currentFile.thumbnailLink.replace("=s220", `=s${lowResDownloads ? 1200 : 1600}`)
                                                : `/api/cloud/thumbnail?c=${cloudAccountId}&f=${currentFile.id}&s=${lowResDownloads ? 1200 : 1600}`
                                            }
                                            alt={currentFile.name}
                                            className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg border border-white/5"
                                            referrerPolicy="no-referrer"
                                        />
                                        {/* Download overlay removed per user request */}
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
                                );
                            })()
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
                </div >
            )
            }
        </AnimatePresence >
    );
}
