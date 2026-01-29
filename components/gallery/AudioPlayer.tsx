"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
    trackUrl: string;
    trackName: string;
    autoPlay?: boolean;
    initialVolume?: number;
    theme?: "dark" | "light";
    externalVideoPlaying?: boolean;
}

export default function AudioPlayer({
    trackUrl,
    trackName,
    autoPlay = false,
    initialVolume = 0.5,
    theme = "dark",
    forcePlay = false,
    externalVideoPlaying = false
}: AudioPlayerProps & { forcePlay?: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const isDark = theme === "dark";

    useEffect(() => {
        // Show player after a delay
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : initialVolume;
        }
    }, [isMuted, initialVolume]);

    // Handle initial Autoplay (best effort)
    useEffect(() => {
        if (autoPlay && audioRef.current && !forcePlay) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => { setIsPlaying(true); setIsVisible(true); })
                    .catch(() => { setIsPlaying(false); setIsVisible(true); });
            }
        }
    }, [autoPlay]);

    // Handle Force Play (triggered by user interaction in parent, e.g. clicking "Enter")
    useEffect(() => {
        if (forcePlay && audioRef.current) {
            audioRef.current.play()
                .then(() => { setIsPlaying(true); setIsVisible(true); })
                .catch((err) => console.error("Force play failed:", err));
        }
    }, [forcePlay]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            if (duration) {
                setProgress((current / duration) * 100);
            }
        }
    };

    const handleEnded = () => {
        // Loop is handled by audio tag, but state sync here
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        }
    };

    // Handle Video Playback Conflict: Mute music instead of pausing
    useEffect(() => {
        if (!audioRef.current) return;

        if (externalVideoPlaying) {
            // Mute music while video plays, but keep it running
            audioRef.current.volume = 0;
        } else {
            // Restore volume when video stops
            // Respect user's mute state
            audioRef.current.volume = isMuted ? 0 : initialVolume;
        }
    }, [externalVideoPlaying, isMuted, initialVolume]);

    return (
        <>
            <audio
                ref={audioRef}
                src={trackUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                loop
            />

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, x: "-50%" }}
                        animate={{ y: 0, opacity: 1, x: "-50%" }}
                        exit={{ y: 100, opacity: 0, x: "-50%" }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        drag
                        dragMomentum={false}
                        whileDrag={{ scale: 1.05, cursor: "grabbing" }}
                        className="fixed bottom-3 left-1/2 z-[150] pointer-events-auto touch-none"
                    >
                        <div className={cn(
                            "flex items-center gap-4 px-5 py-2.5 rounded-full backdrop-blur-xl border shadow-xl transition-all duration-500 cursor-grab active:cursor-grabbing",
                            isDark
                                ? "bg-black/60 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                                : "bg-white/80 border-black/5 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                        )}>
                            {/* Play/Pause Button */}
                            <button
                                onClick={togglePlay}
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                                    isPlaying
                                        ? (isDark ? "bg-white text-black" : "bg-black text-white")
                                        : (isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/5 text-black hover:bg-black/10")
                                )}
                            >
                                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>

                            {/* Track Info & Visualizer */}
                            <div className="flex flex-col gap-1 min-w-[100px]">
                                <div className="flex items-center gap-2">
                                    <Music size={10} className={isDark ? "text-white/40" : "text-black/40"} />
                                    <span className={cn(
                                        "text-xs font-medium tracking-wide",
                                        isDark ? "text-white/80" : "text-black/80"
                                    )}>
                                        {trackName}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className={cn("w-full h-0.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-black/5")}>
                                    <motion.div
                                        className={cn("h-full", isDark ? "bg-white/60" : "bg-black/60")}
                                        style={{ width: `${progress}%` }}
                                        animate={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Volume Control */}
                            <button
                                onClick={toggleMute}
                                className={cn(
                                    "opacity-60 hover:opacity-100 transition-opacity",
                                    isDark ? "text-white" : "text-black"
                                )}
                            >
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
