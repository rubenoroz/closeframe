import React from 'react';
import { ChevronRight } from 'lucide-react';

interface GalleryCoverProps {
    coverImage: string;
    coverImageFocus?: string | null; // "x,y" format (0-100)
    logo?: string | null;
    studioName: string;
    projectName: string;
    onEnter: () => void;
    cloudAccountId: string;
}

export default function GalleryCover({
    coverImage,
    coverImageFocus,
    logo,
    studioName,
    projectName,
    onEnter,
    cloudAccountId
}: GalleryCoverProps) {
    // Generate high-quality thumbnail URL for cover
    const coverUrl = `/api/cloud/thumbnail?c=${cloudAccountId}&f=${coverImage}&s=1200`;

    // Parse focal point for object-position
    const [focusX, focusY] = (coverImageFocus || "50,50").split(",").map(Number);

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0 select-none">
                <img
                    src={coverUrl}
                    alt="Cover"
                    className="w-full h-full object-cover opacity-60 animate-in fade-in duration-1000"
                    style={{ objectPosition: `${focusX}% ${focusY}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 space-y-12 max-w-4xl mx-auto animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-4">
                {/* Branding */}
                <div className="opacity-80">
                    {logo ? (
                        <img src={logo} alt={studioName} className="h-8 md:h-10 w-auto object-contain brightness-0 invert opacity-90" />
                    ) : (
                        <span className="text-white/70 uppercase tracking-[0.2em] text-xs md:text-sm font-medium">{studioName}</span>
                    )}
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-sans font-extralight text-white tracking-tight text-balance drop-shadow-lg">
                    {projectName}
                </h1>

                {/* Enter Button */}
                <button
                    onClick={onEnter}
                    className="group relative flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/20 backdrop-blur-md rounded-full transition-all duration-500 transform hover:scale-105 hover:border-white/40 ring-1 ring-white/10"
                >
                    <span className="text-white text-xs md:text-sm uppercase tracking-[0.2em] font-medium pl-1">Entrar</span>
                    <ChevronRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
            </div>
        </div>
    );
}
