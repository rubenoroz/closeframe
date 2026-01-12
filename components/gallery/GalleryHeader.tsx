"use client";

import React, { useEffect } from "react";

interface GalleryHeaderProps {
    title: string;
    fontFamily: string;
    color: string;
    background: "dark" | "light";
}

export default function GalleryHeader({
    title,
    fontFamily,
    color,
    background,
}: GalleryHeaderProps) {
    useEffect(() => {
        // Dynamically load Google Font if not Inter (default system font)
        if (fontFamily !== "Inter") {
            const link = document.createElement("link");
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(
                / /g,
                "+"
            )}:wght@400;700&display=swap`;
            link.rel = "stylesheet";
            document.head.appendChild(link);

            // Cleanup on unmount
            return () => {
                document.head.removeChild(link);
            };
        }
    }, [fontFamily]);

    return (
        <div
            className={`py-12 md:py-20 text-center transition-colors duration-500 ${background === "light" ? "bg-white" : "bg-black"
                }`}
        >
            <h1
                style={{
                    fontFamily: fontFamily,
                    color: color,
                }}
                className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight px-4 transition-all duration-300"
            >
                {title}
            </h1>
        </div>
    );
}
