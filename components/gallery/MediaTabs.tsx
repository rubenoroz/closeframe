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
    if (!showVideoTab) return null;

    return (
        <div className="flex items-center justify-center py-5">
            <div className="relative flex items-center gap-1 rounded-xl bg-neutral-900 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                {/* Fotos */}
                <button
                    onClick={() => onTabChange("photos")}
                    className={`relative z-10 flex items-center gap-2 px-6 py-3 rounded-lg text-sm tracking-wide transition-all duration-500
            ${activeTab === "photos"
                            ? "bg-[#fefcf5] text-black shadow-[0_8px_30px_rgba(254,252,245,0.35)]"
                            : "text-neutral-400 hover:text-white"}`}
                >
                    <Camera className="w-4 h-4" />
                    FOTOGRAFÍAS
                </button>

                {/* Videos */}
                <button
                    onClick={() => onTabChange("videos")}
                    className={`relative z-10 flex items-center gap-2 px-6 py-3 rounded-lg text-sm tracking-wide transition-all duration-500
            ${activeTab === "videos"
                            ? "bg-[#fefcf5] text-black shadow-[0_8px_30px_rgba(254,252,245,0.35)]"
                            : "text-neutral-400 hover:text-white"}`}
                >
                    <Film className="w-4 h-4" />
                    VIDEOS
                </button>
            </div>
        </div>
    );
}
