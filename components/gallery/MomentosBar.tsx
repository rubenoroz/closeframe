"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Momento {
    id: string;
    name: string;
}

interface MomentosBarProps {
    momentos: Momento[];
    activeMomentoId: string | null; // null = "Todos"
    onMomentoChange: (id: string | null) => void;
    theme?: "dark" | "light";
}

export default function MomentosBar({
    momentos,
    activeMomentoId,
    onMomentoChange,
    theme = "dark"
}: MomentosBarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Filter out system folders if they appear at this level (just in case)
    const filteredMomentos = momentos.filter(m =>
        !['webjpg', 'jpg', 'raw', 'print', 'highres'].includes(m.name.toLowerCase())
    );

    if (filteredMomentos.length === 0) return null;

    const isDark = theme === "dark";

    return (
        <div className="w-full flex justify-center py-6 sticky top-0 z-30 pointer-events-none backdrop-blur-md bg-neutral-900/50 transition-all">
            <div
                ref={scrollRef}
                className="pointer-events-auto max-w-full overflow-x-auto flex items-center gap-2 px-6 pb-2 scrollbar-none no-scrollbar mask-gradient"
                style={{
                    maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
                }}
            >
                {/* Chip "Todos" */}
                <button
                    onClick={() => onMomentoChange(null)}
                    className={cn(
                        "relative flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-light tracking-wide transition-all duration-300 border",
                        activeMomentoId === null
                            ? (isDark
                                ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                : "bg-black text-white border-black shadow-[0_0_20px_rgba(0,0,0,0.3)]")
                            : (isDark
                                ? "bg-black/40 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/30 backdrop-blur-md"
                                : "bg-white/40 text-neutral-600 border-black/5 hover:bg-black/5 hover:text-black hover:border-black/20 backdrop-blur-md")
                    )}
                >
                    Todos
                </button>

                {/* Separator if needed, or just gap */}
                <div className={cn("w-px h-6 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />

                {/* Chips de Momentos */}
                {filteredMomentos.map((momento) => {
                    const isActive = activeMomentoId === momento.id;
                    return (
                        <button
                            key={momento.id}
                            onClick={() => onMomentoChange(momento.id)}
                            className={cn(
                                "relative flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-light tracking-wide transition-all duration-300 border",
                                isActive
                                    ? (isDark
                                        ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                        : "bg-black text-white border-black shadow-[0_0_20px_rgba(0,0,0,0.3)]")
                                    : (isDark
                                        ? "bg-black/40 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/30 backdrop-blur-md"
                                        : "bg-white/40 text-neutral-600 border-black/5 hover:bg-black/5 hover:text-black hover:border-black/20 backdrop-blur-md")
                            )}
                        >
                            {momento.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
