import React from "react";
import { Moment } from "@/lib/gallery/types";

interface MomentsBarProps {
    moments: Moment[];
    current: string | null;
}

export function MomentsBar({ moments, current }: MomentsBarProps) {
    if (moments.length === 0) return null;

    const scrollToMoment = (id: string) => {
        const el = document.getElementById(`momento-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="hidden md:flex items-center gap-6">
            {moments.map((m) => (
                <button
                    key={m.id}
                    onClick={() => scrollToMoment(m.id)}
                    className={`text-xs uppercase tracking-widest transition-colors ${current === m.id ? "text-white" : "text-white/40 hover:text-white/80"
                        }`}
                >
                    {m.name}
                </button>
            ))}
        </div>
    );
}
