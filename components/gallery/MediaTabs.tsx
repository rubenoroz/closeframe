"use client";

import React from "react";
import { Camera, Film } from "lucide-react";

interface MediaTabsProps {
    activeTab: "photos" | "videos";
    onTabChange: (tab: "photos" | "videos") => void;
    showVideoTab: boolean;
    theme?: "dark" | "light";
}

export default function MediaTabs({
    activeTab,
    onTabChange,
    showVideoTab,
    theme = "dark",
}: MediaTabsProps) {
    const isLight = theme === "light";

    return (
        <div className={`flex items-center gap-3 px-4 md:px-8 py-5 ${isLight ? 'bg-neutral-50' : ''}`}>
            {/* Photos Tab - Luxury Gold Theme */}
            <button
                onClick={() => onTabChange("photos")}
                className={`
                    group relative flex items-center gap-2.5 px-7 py-3.5 rounded-full
                    font-medium text-sm tracking-wide uppercase
                    transition-all duration-500 ease-out
                    ${activeTab === "photos"
                        ? isLight
                            ? "bg-gradient-to-r from-stone-800 to-stone-900 text-amber-100 shadow-xl shadow-stone-400/30"
                            : "bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 text-stone-900 shadow-xl shadow-amber-200/40"
                        : isLight
                            ? "bg-white text-stone-500 hover:text-stone-800 ring-1 ring-stone-200 hover:ring-stone-300 hover:shadow-md"
                            : "bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-neutral-300 ring-1 ring-white/10 hover:ring-white/20"
                    }
                `}
            >
                <Camera className={`w-4 h-4 transition-all duration-300 ${activeTab === "photos" ? "scale-110" : "group-hover:scale-105"}`} />
                <span className="font-semibold tracking-widest text-xs">Fotografías</span>
            </button>

            {/* Videos Tab - Luxury Rose/Champagne Theme */}
            {showVideoTab && (
                <button
                    onClick={() => onTabChange("videos")}
                    className={`
                        group relative flex items-center gap-2.5 px-7 py-3.5 rounded-full
                        font-medium text-sm tracking-wide uppercase
                        transition-all duration-500 ease-out
                        ${activeTab === "videos"
                            ? isLight
                                ? "bg-gradient-to-r from-stone-800 to-stone-900 text-rose-100 shadow-xl shadow-stone-400/30"
                                : "bg-gradient-to-r from-rose-100 via-rose-50 to-rose-100 text-stone-900 shadow-xl shadow-rose-200/40"
                            : isLight
                                ? "bg-white text-stone-500 hover:text-stone-800 ring-1 ring-stone-200 hover:ring-stone-300 hover:shadow-md"
                                : "bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-neutral-300 ring-1 ring-white/10 hover:ring-white/20"
                        }
                    `}
                >
                    <Film className={`w-4 h-4 transition-all duration-300 ${activeTab === "videos" ? "scale-110" : "group-hover:scale-105"}`} />
                    <span className="font-semibold tracking-widest text-xs">Videos</span>
                </button>
            )}
        </div>
    );
}
