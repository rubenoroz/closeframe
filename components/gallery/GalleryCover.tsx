import React, { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface GalleryCoverProps {
    coverImage: string;
    coverImageFocus?: string | null; // "x,y" format (0-100)
    fontSize?: number; // Percentage (50-150), default 100
    logo?: string | null;
    studioName: string;
    projectName: string;
    onEnter: () => void;
    cloudAccountId: string;
    profileUrl?: string; // [NEW] Optional profile link
    date?: string | null; // [NEW]
    fontFamily?: string; // [NEW]
}

export default function GalleryCover({
    coverImage,
    coverImageFocus,
    fontSize = 100,
    logo,
    studioName,
    projectName,
    onEnter,
    cloudAccountId,
    profileUrl,
    date, // [NEW]
    fontFamily = "Inter" // [NEW]
}: GalleryCoverProps) {
    useEffect(() => {
        // Dynamically load Google Font if not Inter (default system font)
        if (fontFamily && fontFamily !== "Inter") {
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
    // Generate high-quality thumbnail URL for cover
    const coverUrl = `/api/cloud/thumbnail?c=${cloudAccountId}&f=${coverImage}&s=1200`;

    // Parse focal point for object-position
    const parts = (coverImageFocus || "50,50,1").split(",").map(Number);
    const x = parts[0] !== undefined ? parts[0] : 50;
    const y = parts[1] !== undefined ? parts[1] : 50;
    const scale = parts[2] || 1;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0 select-none overflow-hidden">
                <img
                    src={coverUrl}
                    alt="Cover"
                    className="w-full h-full object-cover opacity-60 animate-in fade-in duration-1000"
                    style={{
                        objectPosition: `${x}% ${y}%`,
                        transform: `scale(${scale})`
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
            </div>

            {/* Content Container - Full Screen Absolute */}
            <div className="absolute inset-0 z-10 p-6 md:p-12 flex flex-col justify-between animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-4">

                <div className="self-start opacity-80">
                    {logo ? (
                        profileUrl ? (
                            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                <img src={logo} alt={studioName} className="h-10 md:h-16 w-auto object-contain opacity-90" />
                            </a>
                        ) : (
                            <img src={logo} alt={studioName} className="h-10 md:h-16 w-auto object-contain opacity-90" />
                        )
                    ) : (
                        profileUrl ? (
                            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                <span className="text-white/70 uppercase tracking-[0.2em] text-xs md:text-sm font-medium">{studioName}</span>
                            </a>
                        ) : (
                            <span className="text-white/70 uppercase tracking-[0.2em] text-xs md:text-sm font-medium">{studioName}</span>
                        )
                    )}
                </div>

                {/* Bottom Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-0 mt-auto w-full">

                    {/* Title - Bottom Left */}
                    <h1
                        className="text-4xl md:text-6xl lg:text-7xl font-sans font-extralight text-white tracking-tight text-balance drop-shadow-lg text-left"
                        style={{
                            fontSize: `${fontSize / 100}em`,
                            fontFamily: fontFamily !== "Inter" ? `'${fontFamily}', sans-serif` : "inherit"
                        }}
                    >
                        {projectName}
                    </h1>

                    {/* Date removed as per user request */}

                    {/* Button - Bottom Right (Desktop) / Below Title (Mobile) */}
                    <div className="md:self-end">
                        <button
                            onClick={onEnter}
                            className="group relative flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/20 backdrop-blur-md rounded-full transition-all duration-500 transform hover:scale-105 hover:border-white/40 ring-1 ring-white/10"
                        >
                            <span className="text-white text-xs md:text-sm uppercase tracking-[0.2em] font-medium pl-1">VER GALERÍA</span>
                            <ChevronRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
