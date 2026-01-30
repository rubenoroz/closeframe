import React from "react";
import { MediaItem } from "@/lib/gallery/types";
import { Play } from "lucide-react";
import { motion } from "framer-motion";

interface MediaCardProps {
    item: MediaItem;
    layoutType?: "mosaic" | "grid";
}

export function MediaCard({ item, layoutType = "mosaic" }: MediaCardProps) {
    const isVideo = item.isVideo;

    // Construct image URL. 
    // For Drive: use thumbnail proxy or direct link if available.
    // We'll trust item.thumbnailUrl or proxy endpoint.
    const imgSrc = item.thumbnailUrl || `/api/cloud/thumbnail?fileId=${item.id}&w=800`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`group relative bg-[#111] overflow-hidden rounded-sm cursor-pointer ${layoutType === "grid" ? "w-full" : ""
                }`}
        >
            <div
                className={layoutType === "grid"
                    ? (isVideo ? "aspect-video" : "aspect-[3/2]")
                    : "aspect-auto"
                }
            >
                <img
                    src={imgSrc}
                    alt={item.name}
                    loading="lazy"
                    className={`w-full transition-transform duration-700 ease-out group-hover:scale-105 group-hover:opacity-90 ${layoutType === "grid" ? "h-full object-cover" : "h-auto object-cover"
                        }`}
                />
            </div>

            {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-full border border-white/20 group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 text-[10px] font-mono text-white/80 rounded">
                        {item.provider === "youtube" || item.provider === "vimeo" ? item.provider.toUpperCase() : "VIDEO"}
                    </div>
                </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </motion.div>
    );
}
