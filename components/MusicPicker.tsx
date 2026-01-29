"use client";

import React, { useState, useRef, useEffect } from "react";
import { MUSIC_LIBRARY, MusicTrack } from "@/lib/music-library";
import { Play, Pause, Music, Volume2, Sparkles } from "lucide-react";

interface MusicPickerProps {
    selectedTrackId: string | null;
    onSelect: (trackId: string) => void;
}

export default function MusicPicker({ selectedTrackId, onSelect }: MusicPickerProps) {
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Stop audio when component unmounts
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const togglePreview = (e: React.MouseEvent, track: MusicTrack) => {
        e.stopPropagation();

        if (playingId === track.id) {
            // Stop
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            // Start new
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(track.url);
            audio.volume = 0.5;
            audio.onended = () => setPlayingId(null);
            audio.play().catch(err => console.error("Preview playback failed", err));

            audioRef.current = audio;
            setPlayingId(track.id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {MUSIC_LIBRARY.map((track) => {
                    const isSelected = selectedTrackId === track.id;
                    const isPlaying = playingId === track.id;

                    return (
                        <div
                            key={track.id}
                            onClick={() => onSelect(track.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                ? "bg-emerald-500/10 border-emerald-500/50"
                                : "bg-neutral-800/50 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={(e) => togglePreview(e, track)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isPlaying
                                        ? "bg-emerald-500 text-white"
                                        : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600 hover:text-white"
                                        }`}
                                >
                                    {isPlaying ? (
                                        <Pause className="w-3 h-3" />
                                    ) : (
                                        <Play className="w-3 h-3 ml-0.5" />
                                    )}
                                </button>
                                <div>
                                    <div className={`text-sm font-medium ${isSelected ? "text-emerald-400" : "text-white"}`}>
                                        {track.name}
                                    </div>
                                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                        <span>{track.category}</span>
                                        <span>•</span>
                                        <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                    {track.licenseCode && (
                                        <div className="text-[9px] text-neutral-600 mt-0.5 font-mono">
                                            Licencia: {track.licenseCode}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isSelected && (
                                <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded font-medium">
                                    Seleccionada
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-[10px] text-neutral-500 italic flex items-center gap-1.5">
                <Volume2 className="w-3 h-3" />
                La música se reproducirá automáticamente en la galería con los controles visibles.
            </p>
        </div>
    );
}
