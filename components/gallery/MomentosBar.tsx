"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

interface Momento {
    id: string;
    name: string;
}

interface MomentosBarProps {
    momentos: Momento[];
    activeMomentoId: string | null; // null = "Todos"
    onMomentoChange: (id: string | null) => void;
    theme?: "dark" | "light";
    // New: file counts per momento
    counts?: Record<string, number>;
    totalCount?: number;
    // New: search
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
}

export default function MomentosBar({
    momentos,
    activeMomentoId,
    onMomentoChange,
    theme = "dark",
    counts,
    totalCount,
    searchTerm = "",
    onSearchChange
}: MomentosBarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Filter out system folders if they appear at this level (just in case)
    const filteredMomentos = momentos.filter(m =>
        !['webjpg', 'jpg', 'raw', 'print', 'highres'].includes(m.name.toLowerCase())
    );

    if (filteredMomentos.length === 0) return null;

    const isDark = theme === "dark";

    const handleSearchToggle = () => {
        if (isSearchOpen && searchTerm) {
            // Clear search when closing
            onSearchChange?.("");
        }
        setIsSearchOpen(!isSearchOpen);
    };

    // Get the name of the active momento for display
    const activeMomentoName = (activeMomentoId === null || activeMomentoId === 'all')
        ? "Todos"
        : filteredMomentos.find(m => m.id === activeMomentoId)?.name || "Selección";

    return (
        <div className="w-full flex flex-col items-center py-4 sticky top-0 z-30 pointer-events-none backdrop-blur-md bg-neutral-900/50 transition-all">
            {/* Chips Row */}
            <div
                ref={scrollRef}
                className="pointer-events-auto max-w-full overflow-x-auto flex items-center gap-2 px-6 pb-2 scrollbar-none no-scrollbar mask-gradient touch-pan-x"
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
                        (activeMomentoId === null || activeMomentoId === 'all')
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

                {/* Separator */}
                <div className={cn("w-px h-6 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />

                {/* Chips de Momentos */}
                {filteredMomentos.map((momento) => {
                    const isActive = activeMomentoId === momento.id;
                    const count = counts?.[momento.id];
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
                            {count !== undefined && count > 0 && (
                                <span className={cn(
                                    "text-xs opacity-60",
                                    isActive ? "opacity-80" : ""
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Separator before search */}
                {onSearchChange && (
                    <>
                        <div className={cn("w-px h-6 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />

                        {/* Search Toggle/Input */}
                        <div className="flex items-center">
                            {isSearchOpen ? (
                                <div className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md transition-all",
                                    isDark
                                        ? "bg-black/40 border-white/20"
                                        : "bg-white/40 border-black/10"
                                )}>
                                    <Search className={cn("w-4 h-4", isDark ? "text-white/60" : "text-black/60")} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        placeholder="Buscar..."
                                        autoFocus
                                        className={cn(
                                            "bg-transparent border-none outline-none text-sm w-32 placeholder:opacity-50",
                                            isDark ? "text-white placeholder:text-white" : "text-black placeholder:text-black"
                                        )}
                                    />
                                    <button
                                        onClick={handleSearchToggle}
                                        className={cn(
                                            "p-0.5 rounded-full transition-colors",
                                            isDark ? "hover:bg-white/10" : "hover:bg-black/10"
                                        )}
                                    >
                                        <X className={cn("w-3.5 h-3.5", isDark ? "text-white/60" : "text-black/60")} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleSearchToggle}
                                    className={cn(
                                        "p-2.5 rounded-full border transition-all duration-300",
                                        isDark
                                            ? "bg-black/40 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white hover:border-white/30 backdrop-blur-md"
                                            : "bg-white/40 border-black/5 text-neutral-600 hover:bg-black/5 hover:text-black hover:border-black/20 backdrop-blur-md"
                                    )}
                                    title="Buscar"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Counter Row - displayed below chips */}
            {totalCount !== undefined && (
                <div className={cn(
                    "text-xs font-light tracking-wider mt-2 pointer-events-auto",
                    isDark ? "text-neutral-500" : "text-neutral-400"
                )}>
                    {totalCount} {totalCount === 1 ? 'imagen' : 'imágenes'} en {activeMomentoName}
                </div>
            )}
        </div>
    );
}
