"use client";

import React, { useEffect } from "react";

interface GalleryHeaderProps {
    title: string;
    fontFamily: string;
    color: string;
    background: "dark" | "light";
    logo?: string | null;
    coverImage?: string | null;
    coverImageFocus?: string | null; // "x,y" format (0-100)
    cloudAccountId?: string;
}

export default function GalleryHeader({
    title,
    fontFamily,
    color,
    background,
    logo,
    coverImage,
    coverImageFocus,
    cloudAccountId,
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

    // Build cover image URL if available
    const coverImageUrl = coverImage && cloudAccountId
        ? `/api/cloud/thumbnail?c=${cloudAccountId}&f=${coverImage}&s=1200`
        : null;

    // Parse focal point for object-position
    const [focusX, focusY] = (coverImageFocus || "50,50").split(",").map(Number);

    return (
        <div
            className={`relative py-16 md:py-24 text-center transition-colors duration-500 flex flex-col items-center justify-center gap-4 overflow-hidden ${background === "light" ? "bg-white" : "bg-black"
                }`}
        >
            {/* Cover Image Background */}
            {coverImageUrl && (
                <>
                    <div
                        className="absolute inset-0 bg-cover"
                        style={{
                            backgroundImage: `url(${coverImageUrl})`,
                            backgroundPosition: `${focusX}% ${focusY}%`
                        }}
                    />
                    <div className={`absolute inset-0 ${background === "light"
                        ? "bg-white/70 backdrop-blur-sm"
                        : "bg-black/60 backdrop-blur-sm"
                        }`} />
                </>
            )}

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-4">
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
                            src={background === "light" ? "/scenai-icon.svg" : "/logo-white.svg"}
                            alt="Closeframe"
                            className="h-full w-auto object-contain"
                        />
                    </div>
                )}

                {/* Gallery Title */}
                <h1
                    className={`text-2xl md:text-3xl font-light tracking-wide ${background === "light" ? "text-neutral-800" : "text-white/90"
                        }`}
                    style={{
                        fontFamily: fontFamily !== "Inter" ? `'${fontFamily}', sans-serif` : "inherit",
                        color: color !== "#FFFFFF" ? color : undefined
                    }}
                >
                    {title}
                </h1>
            </div>
        </div>
    );
}
