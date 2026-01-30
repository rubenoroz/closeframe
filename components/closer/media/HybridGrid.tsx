import React from "react";
import { MediaItem } from "@/lib/gallery/types";
import { MediaCard } from "./MediaCard";

interface HybridGridProps {
    items: MediaItem[];
}

export function HybridGrid({ items }: HybridGridProps) {
    if (!items || items.length === 0) return null;

    return (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {items.map((item) => (
                <div key={item.id || item.providerId} className="break-inside-avoid">
                    <MediaCard item={item} />
                </div>
            ))}
        </div>
    );
}
