"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CloserGalleryStructure } from "@/lib/gallery/types";
import { GalleryCover } from "./cover/GalleryCover";
import { MomentsBar } from "./navigation/MomentsBar";
import MediaTabs from "@/components/gallery/MediaTabs";
import { HybridGrid } from "./media/HybridGrid";
import { MusicPlayer } from "./ui/MusicPlayer";
import { useScroll, useTransform } from "framer-motion";

interface CloserGalleryClientProps {
    project: any; // Type Project with includes
    structure: CloserGalleryStructure;
    studioProfile: any;
}

export default function CloserGalleryClient({ project, structure, studioProfile }: CloserGalleryClientProps) {
    const [started, setStarted] = useState(false);
    const [currentMomento, setCurrentMomento] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");

    // Scroll progress for fancy effects
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 50], [0.8, 1]);
    const headerBg = useTransform(scrollY, [0, 50], ["rgba(0,0,0,0)", "rgba(0,0,0,0.5)"]);

    const handleEnter = () => {
        setStarted(true);
    };

    if (!started) {
        return (
            <GalleryCover
                project={project}
                onEnter={handleEnter}
                studioProfile={studioProfile}
            />
        );
    }

    // Filter all videos for the "videos" tab
    const allVideos = activeTab === "videos"
        ? [
            ...structure.highlights.filter(i => i.isVideo),
            ...structure.moments.flatMap(m => m.items.filter(i => i.isVideo))
        ]
        : [];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/20 selection:text-white">
            {/* Header */}
            <motion.header
                style={{ opacity: headerOpacity, backgroundColor: headerBg }}
                className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md border-b border-white/5"
            >
                <div className="font-medium tracking-tight text-sm text-gray-200">
                    {studioProfile?.businessName || "Studio"}
                </div>
                <div className="flex items-center gap-4">
                    {activeTab === "photos" && (
                        <MomentsBar moments={structure.moments} current={currentMomento} />
                    )}
                    <MediaTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        showVideoTab={project.enableVideoTab}
                        theme="dark"
                    />
                </div>
            </motion.header>

            {/* Music Player */}
            {project.musicEnabled && (
                <MusicPlayer trackId={project.musicTrackId} />
            )}

            {/* Main Content Stream */}
            <main className="relative z-10 pt-20 pb-32">
                {activeTab === "videos" ? (
                    <section className="px-4 md:px-8 max-w-[1800px] mx-auto mt-12">
                        <div className="mb-12 border-b border-white/10 pb-6">
                            <h2 className="text-4xl font-light tracking-tight">Videos</h2>
                            <p className="text-white/40 text-sm mt-2 font-light">Colección de momentos en movimiento</p>
                        </div>
                        {allVideos.length > 0 ? (
                            <HybridGrid items={allVideos} />
                        ) : (
                            <div className="py-24 text-center text-white/20 uppercase tracking-widest text-xs">
                                No hay videos disponibles en esta galería
                            </div>
                        )}
                    </section>
                ) : (
                    <>
                        {/* Intro / Highlights */}
                        {structure.highlights.length > 0 && (
                            <section className="px-4 md:px-8 max-w-[1800px] mx-auto mb-24">
                                <HybridGrid items={structure.highlights} />
                            </section>
                        )}

                        {/* Momentos Sections */}
                        {structure.moments.map((moment) => (
                            <section
                                key={moment.id}
                                id={`momento-${moment.id}`}
                                onMouseEnter={() => setCurrentMomento(moment.id)}
                                className="mb-32 px-4 md:px-8 max-w-[1800px] mx-auto scroll-mt-24"
                            >
                                <div className="sticky top-20 z-20 py-8 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent mb-4 pointer-events-none">
                                    <div className="flex items-end justify-between border-b border-white/10 pb-4">
                                        <h2 className="text-3xl font-light text-white tracking-tight pointer-events-auto">
                                            {moment.name}
                                        </h2>
                                        <span className="text-sm text-white/40 font-mono">
                                            {moment.items.length} MEMORIES
                                        </span>
                                    </div>
                                </div>

                                <HybridGrid items={moment.items} />
                            </section>
                        ))}
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="py-24 text-center text-white/30 text-sm">
                <p>Curated by {studioProfile?.businessName}</p>
                <div className="mt-4 flex justify-center gap-4 text-xs tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity">
                    <span>Inquiries</span>
                    <span>Website</span>
                </div>
            </footer>
        </div>
    );
}
