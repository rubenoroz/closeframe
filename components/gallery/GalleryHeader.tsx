"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

interface GalleryHeaderProps {
    title: string;
    fontFamily: string;
    fontSize?: number; // Percentage (50-150), default 100
    color: string;
    background: "dark" | "light";
    layoutType?: string; // [NEW] "grid", "mosaic", "editorial"
    logo?: string | null;
    coverImage?: string | null;
    coverImageFocus?: string | null; // "x,y" format (0-100)
    cloudAccountId?: string;
    profileUrl?: string; // Optional profile link
    date?: string | null;
    logoScale?: number; // [NEW] Percentage scale for the logo
}

export default function GalleryHeader({
    title,
    fontFamily,
    fontSize = 100,
    color,
    background,
    layoutType,
    logo,
    coverImage,
    coverImageFocus,
    cloudAccountId,
    profileUrl,
    date, // [NEW]
    logoScale = 100, // [NEW]
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
        ? `/api/cloud/thumbnail?c=${cloudAccountId}&f=${encodeURIComponent(coverImage)}&s=1200`
        : null;

    // Parse focal point for object-position
    const parts = (coverImageFocus || "50,50,1").split(",").map(Number);
    const x = parts[0] !== undefined ? parts[0] : 50;
    const y = parts[1] !== undefined ? parts[1] : 50;
    const scale = parts[2] || 1;

    // Calculate font size scale
    const fontScale = fontSize / 100;

    // Logo Rendering Logic
    const renderLogo = () => {
        if (logo) {
            // Client Logo
            return profileUrl ? (
                <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                    className="relative hover:opacity-80 transition-opacity block w-auto"
                    style={{ height: `${(4 * (logoScale / 100))}rem` }}
                >
                    <img
                        src={logo}
                        alt="Studio Logo"
                        className={cn(
                            "h-full w-auto",
                            layoutType === "editorial" ? "object-left object-contain" : "object-contain"
                        )}
                    />
                </a>
            ) : (
                <div
                    className="relative block w-auto"
                    style={{ height: `${(4 * (logoScale / 100))}rem` }}
                >
                    <img
                        src={logo}
                        alt="Studio Logo"
                        className={cn(
                            "h-full w-auto",
                            layoutType === "editorial" ? "object-left object-contain" : "object-contain"
                        )}
                    />
                </div>
            );
        } else {
            // Default Closerlens Logo (Fallback)
            return (
                <div className={cn(
                    "relative opacity-80 block",
                    layoutType === "editorial" ? "h-6 md:h-8 w-auto" : "h-8 w-auto"
                )}>
                    <img
                        src={background === "light" ? "/closerlens-logo-qr.svg" : "/logo-white.svg"}
                        alt="Closerlens"
                        className={cn(
                            "h-full w-auto",
                            layoutType === "editorial" ? "object-left object-contain" : "object-contain"
                        )}
                    />
                </div>
            );
        }
    };

    return (
        <div
            className={cn(
                "relative transition-colors duration-500 overflow-hidden",
                background === "light" ? "bg-white" : "bg-black",
                layoutType === "editorial"
                    ? "py-12 md:py-20 px-6 md:px-12 text-left flex flex-col justify-end min-h-[40vh] md:min-h-[50vh]"
                    : "py-16 md:py-24 text-center flex flex-col items-center justify-center gap-4"
            )}
        >
            {/* Cover Image Background */}
            {coverImageUrl && (
                <>
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <img
                            src={coverImageUrl}
                            alt="Header Background"
                            className="w-full h-full object-cover"
                            style={{
                                objectPosition: `${x}% ${y}%`,
                                transform: `scale(${scale})`
                            }}
                        />
                    </div>
                    {/* Dark/Light overlay gradient for editorial to ensure text readability */}
                    {layoutType === "editorial" ? (
                        <div className={cn(
                            "absolute inset-0",
                            background === "light"
                                ? "bg-gradient-to-t from-white via-white/80 to-transparent backdrop-blur-[2px]"
                                : "bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-[2px]"
                        )} />
                    ) : (
                        <div className={cn(
                            "absolute inset-0 backdrop-blur-sm",
                            background === "light" ? "bg-white/70" : "bg-black/60"
                        )} />
                    )}
                </>
            )}

            {/* Absolute Logo for Editorial Layout (Top Left) */}
            {layoutType === "editorial" && (
                <div className="absolute top-6 left-6 md:top-12 md:left-12 z-20 drop-shadow-md">
                    {renderLogo()}
                </div>
            )}

            {/* Content */}
            <div className={cn(
                "relative z-10 flex flex-col",
                layoutType === "editorial" ? "items-start gap-6 max-w-4xl" : "items-center gap-4"
            )}>
                {/* Logo for Non-Editorial Layouts */}
                {layoutType !== "editorial" && renderLogo()}

                {/* Gallery Title */}
                <h1
                    className={cn(
                        "font-light tracking-wide",
                        background === "light" ? "text-neutral-800" : "text-white/90",
                        layoutType === "editorial" ? "text-4xl md:text-6xl font-normal leading-tight mx-0" : "text-2xl md:text-3xl"
                    )}
                    style={{
                        fontFamily: fontFamily !== "Inter" ? `'${fontFamily}', sans-serif` : "inherit",
                        color: color !== "#FFFFFF" ? color : undefined,
                        fontSize: layoutType !== "editorial" ? `${fontScale}em` : undefined // Override fontScale for editorial sizing or use it as a multiplier
                    }}
                >
                    {title}
                </h1>

                {/* Date removed as per user request */}
            </div>
        </div>
    );
}
