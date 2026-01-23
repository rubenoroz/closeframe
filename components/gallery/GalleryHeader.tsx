"use client";

import React, { useEffect } from "react";

interface GalleryHeaderProps {
    title: string;
    fontFamily: string;
    color: string;
    background: "dark" | "light";
    logo?: string | null;
}

export default function GalleryHeader({
    title,
    fontFamily,
    color,
    background,
    logo,
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
            className={`py-12 md:py-20 text-center transition-colors duration-500 flex flex-col items-center justify-center gap-6 ${background === "light" ? "bg-white" : "bg-black"
                }`}
        >
            {/* Logo Logic: Client Logo OR Default Closeframe Logo */}
            {logo ? (
                // Client Logo
                <div className="relative h-16 w-auto max-w-[200px]">
                    <img
                        src={logo}
                        alt="Studio Logo"
                        className="h-full w-auto object-contain"
                    />
                </div>
            ) : (
                // Default Closeframe Logo (Fallback)
                <div className="relative h-8 w-auto opacity-80">
                    <img
                        src={background === "light" ? "/scenai-icon.svg" : "/logo-white.svg"} // Using logo-white for dark mode, scenai-icon (placeholder) or maybe generic text for light?
                        alt="Closeframe"
                        className="h-full w-auto object-contain"
                    />
                </div>
            )}
        </div>
    );
}
