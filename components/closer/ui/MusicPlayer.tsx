import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Play, Pause, Music } from "lucide-react";

interface MusicPlayerProps {
    trackId?: string; // Logic to fetch track url
}

// Hardcoded track for demo matching existing config or pass URL
// In real impl, fetch track details based on trackId from project.musicTrackId

export function MusicPlayer({ trackId }: MusicPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initial play effect (user interaction usually required unless autoplay policy allows)
    // We'll rely on global start state triggering this, but browser might block.
    // For now, render component, let user control.

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.log("Autoplay blocked", e));
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Audio Element Hidden */}
            <audio
                ref={audioRef}
                src="/audio/emotion.mp3" // Default fallback or dynamic
                loop
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            <motion.div
                layout
                initial={false}
                animate={{ width: isExpanded ? "auto" : "auto" }}
                className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full p-1 flex items-center gap-2 overflow-hidden shadow-2xl"
            >
                {/* Visualizer / Icon */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                    {isPlaying ? (
                        <div className="flex gap-0.5 items-end h-3">
                            {[1, 2, 3, 4].map(i => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [4, 12, 4] }}
                                    transition={{ repeat: Infinity, duration: 0.5 + i * 0.1 }}
                                    className="w-0.5 bg-white"
                                />
                            ))}
                        </div>
                    ) : (
                        <Music className="w-4 h-4 text-white/50" />
                    )}
                </button>

                {/* Controls */}
                <AnimatePresence>
                    {(isExpanded || isPlaying) && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="flex items-center gap-1 pr-3 whitespace-nowrap overflow-hidden"
                        >
                            <div className="flex flex-col mx-2 min-w-[80px]">
                                <span className="text-[10px] text-white/50 uppercase tracking-wider leading-none">Soundtrack</span>
                                <span className="text-xs text-white font-medium leading-none mt-1">Cinematic Emotion</span>
                            </div>

                            <button onClick={togglePlay} className="p-2 hover:text-white text-white/70 transition-colors">
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </button>

                            <button onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.muted = !isMuted;
                                    setIsMuted(!isMuted);
                                }
                            }} className="p-2 hover:text-white text-white/70 transition-colors">
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
