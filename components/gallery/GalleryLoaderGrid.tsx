"use client";

import { useEffect, useState } from "react";

type Phase = 0 | 1 | 2 | 3;

interface Props {
    theme?: string;
}

export default function GalleryLoaderGrid({ theme = "dark" }: Props) {
    const [phase, setPhase] = useState<Phase>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPhase((p) => ((p + 1) % 4) as Phase);
        }, 1600);

        return () => clearInterval(interval);
    }, []);

    const base =
        "rounded-lg transition-all duration-[1200ms] ease-[cubic-bezier(0.4,0,0.2,1)]";

    // Dynamic colors based on theme
    const primaryColor = theme === "light" ? "bg-neutral-300" : "bg-neutral-600";
    const secondaryColor = theme === "light" ? "bg-neutral-200" : "bg-neutral-700";

    return (
        <div className="flex-1 flex items-center justify-center py-40">
            <div className="grid grid-cols-2 grid-rows-2 gap-1.5 w-[200px] h-[200px]">
                {/* A – Top Left (primary) */}
                <div
                    className={`${base} ${primaryColor}
                        ${phase === 0 ? "scale-x-[1.25]" : "scale-x-[1]"}
                        ${phase === 3 ? "scale-y-[0.75]" : "scale-y-[1]"}
                    `}
                />

                {/* B – Top Right (secondary) */}
                <div
                    className={`${base} ${secondaryColor}
                        ${phase === 0 ? "scale-x-[0.75]" : "scale-x-[1]"}
                        ${phase === 1 ? "scale-y-[1.25]" : "scale-y-[1]"}
                    `}
                />

                {/* D – Bottom Left (secondary) */}
                <div
                    className={`${base} ${secondaryColor}
                        ${phase === 2 ? "scale-x-[0.75]" : "scale-x-[1]"}
                        ${phase === 3 ? "scale-y-[1.25]" : "scale-y-[1]"}
                    `}
                />

                {/* C – Bottom Right (primary) */}
                <div
                    className={`${base} ${primaryColor}
                        ${phase === 1 ? "scale-y-[0.75]" : "scale-y-[1]"}
                        ${phase === 2 ? "scale-x-[1.25]" : "scale-x-[1]"}
                    `}
                />
            </div>
        </div>
    );
}
