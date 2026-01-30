import React from "react";
import { MediaItem } from "@/lib/gallery/types";
import { MediaCard } from "./MediaCard";

interface HybridGridProps {
    items: MediaItem[];
    layoutType?: "mosaic" | "grid";
}

export function HybridGrid({ items, layoutType = "mosaic" }: HybridGridProps) {
    if (!items || items.length === 0) return null;

    if (layoutType === "grid") {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                    <div key={item.id || item.providerId}>
                        <MediaCard item={item} layoutType={layoutType} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {items.map((item) => (
                <div key={item.id || item.providerId} className="break-inside-avoid">
                    <MediaCard item={item} layoutType={layoutType} />
                </div>
            ))}
        </div>
    );
}
