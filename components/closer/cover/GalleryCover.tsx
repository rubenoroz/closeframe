import React from "react";
import { motion } from "framer-motion";

interface GalleryCoverProps {
    project: any;
    onEnter: () => void;
    studioProfile: any;
}

export function GalleryCover({ project, onEnter, studioProfile }: GalleryCoverProps) {
    return (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
            {/* Background Image (should be project cover) */}
            {project.coverImage && (
                <div className="absolute inset-0 z-0">
                    <img
                        src={`/api/cloud/thumbnail?fileId=${project.coverImage}&w=1920`}
                        alt="Background"
                        className="w-full h-full object-cover opacity-40 blur-sm scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/50 to-black/30" />
                </div>
            )}

            <div className="relative z-10 max-w-2xl w-full flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-8"
                >
                    <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-white/60 mb-4">
                        {studioProfile?.businessName || "PRESENTED BY"}
                    </p>
                    <h1 className="text-5xl md:text-7xl font-light text-white tracking-tight leading-tight mb-6 font-serif">
                        {project.headerTitle || project.name}
                    </h1>
                    <div className="h-px w-24 bg-white/30 mx-auto" />
                </motion.div>

                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    onClick={onEnter}
                    className="group relative px-8 py-4 bg-transparent border border-white/20 text-white text-sm tracking-widest uppercase overflow-hidden hover:bg-white/5 transition-colors rounded-sm"
                >
                    <span className="relative z-10 group-hover:tracking-[0.25em] transition-all duration-300">
                        Enter Gallery
                    </span>
                </motion.button>
            </div>

            {/* Branding/Footer on Cover */}
            <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-[10px] text-white/20 uppercase tracking-widest">
                    Closer Experience
                </p>
            </div>
        </div>
    );
}
