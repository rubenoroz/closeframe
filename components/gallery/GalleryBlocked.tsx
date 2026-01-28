"use client";

import React from "react";
import { Camera, Lock } from "lucide-react";
import Link from "next/link";

interface GalleryBlockedProps {
    studioName?: string;
    studioLogo?: string;
}

export default function GalleryBlocked({ studioName, studioLogo }: GalleryBlockedProps) {
    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-6">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-md">
                {/* Icon */}
                <div className="w-20 h-20 rounded-full bg-neutral-800/50 border border-neutral-700 flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-neutral-500" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-3">
                    Galería no disponible
                </h1>

                {/* Description */}
                <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                    Esta galería no está disponible en este momento.
                    Si eres el propietario, por favor verifica tu cuenta.
                </p>

                {/* Studio branding if available */}
                {(studioLogo || studioName) && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900/50 rounded-full border border-neutral-800 mb-8">
                        {studioLogo ? (
                            <img src={studioLogo} alt="" className="h-5 w-auto" />
                        ) : (
                            <Camera className="w-4 h-4 text-neutral-500" />
                        )}
                        <span className="text-neutral-400 text-xs">{studioName}</span>
                    </div>
                )}

                {/* Back to home */}
                <Link
                    href="/"
                    className="text-sm text-neutral-500 hover:text-white transition"
                >
                    ← Volver al inicio
                </Link>
            </div>

            {/* Minimal branding */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur rounded-full text-xs text-white/30 hover:text-white/50 transition border border-white/5"
                >
                    <Camera className="w-3 h-3" />
                    <span>Powered by Closerlens</span>
                </Link>
            </div>
        </div>
    );
}
