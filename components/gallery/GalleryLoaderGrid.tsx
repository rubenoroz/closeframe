"use client";

import { useEffect, useState } from "react";

type Phase = 0 | 1 | 2 | 3;

interface Props {
    theme?: string;
}

export default function GalleryLoaderGrid({ theme = "dark" }: Props) {
    // Dynamic colors based on theme
    const primaryColor = theme === "light" ? "bg-neutral-300" : "bg-neutral-600";
    const secondaryColor = theme === "light" ? "bg-neutral-200" : "bg-neutral-700";

    return (
        <div className="flex-1 flex items-center justify-center py-40">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scaleGridTopLeft {
                    0%, 100% { transform: scale(1.25, 1); }
                    25% { transform: scale(1, 1); }
                    50% { transform: scale(1, 1); }
                    75% { transform: scale(1, 0.75); }
                }
                @keyframes scaleGridTopRight {
                    0%, 100% { transform: scale(0.75, 1); }
                    25% { transform: scale(1, 1.25); }
                    50% { transform: scale(1, 1); }
                    75% { transform: scale(1, 1); }
                }
                @keyframes scaleGridBottomRight {
                    0%, 100% { transform: scale(1, 1); }
                    25% { transform: scale(1, 0.75); }
                    50% { transform: scale(1.25, 1); }
                    75% { transform: scale(1, 1); }
                }
                @keyframes scaleGridBottomLeft {
                    0%, 100% { transform: scale(1, 1); }
                    25% { transform: scale(1, 1); }
                    50% { transform: scale(0.75, 1); }
                    75% { transform: scale(1, 1.25); }
                }
                .loader-block {
                    border-radius: 0.5rem;
                    animation-duration: 6.4s;
                    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    animation-iteration-count: infinite;
                    will-change: transform;
                }
                .loader-tl { animation-name: scaleGridTopLeft; }
                .loader-tr { animation-name: scaleGridTopRight; }
                .loader-br { animation-name: scaleGridBottomRight; }
                .loader-bl { animation-name: scaleGridBottomLeft; }
            `}} />

            <div className="grid grid-cols-2 grid-rows-2 gap-1.5 w-[200px] h-[200px]">
                {/* A – Top Left (primary) */}
                <div className={`loader-block loader-tl ${primaryColor}`} />

                {/* B – Top Right (secondary) */}
                <div className={`loader-block loader-tr ${secondaryColor}`} />

                {/* D – Bottom Left (secondary) */}
                <div className={`loader-block loader-bl ${secondaryColor}`} />

                {/* C – Bottom Right (primary) */}
                <div className={`loader-block loader-br ${primaryColor}`} />
            </div>
        </div>
    );
}
