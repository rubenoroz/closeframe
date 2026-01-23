"use client";

import React, { useState } from "react";
import { Lock, ArrowRight, Loader2, Camera } from "lucide-react";
import { motion } from "framer-motion";

interface GalleryLockProps {
    slug: string;
    projectName: string;
    onUnlock: () => void;
    logo?: string | null;
    studioName?: string;
}

export default function GalleryLock({ slug, projectName, onUnlock, logo, studioName = "CloserLens Gallery" }: GalleryLockProps) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/projects/verify-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Store in session storage to avoid re-asking during same session
                sessionStorage.setItem(`gallery_unlocked_${slug}`, "true");
                onUnlock();
            } else {
                setError(data.error || "Contraseña incorrecta");
            }
        } catch (err) {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/20">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-light mb-2">{projectName}</h1>
                    <p className="text-neutral-500">Esta galería está protegida por una contraseña.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input
                            type="password"
                            placeholder="Introduce la contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-neutral-600"
                            required
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-30 disabled:grayscale"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <ArrowRight className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm text-center"
                        >
                            {error}
                        </motion.p>
                    )}
                </form>

                <div className="mt-16 flex justify-center opacity-30">
                    {logo ? (
                        <img src={logo} alt={studioName} className="h-8 w-auto object-contain grayscale" />
                    ) : (
                        <div className="flex items-center gap-2 text-xs">
                            <Camera className="w-4 h-4" />
                            <span className="tracking-widest uppercase">{studioName}</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
