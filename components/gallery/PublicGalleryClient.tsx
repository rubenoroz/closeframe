"use client";

import React, { useState, useEffect } from "react";
import GalleryViewer from "@/components/gallery/GalleryViewer";
import GalleryLock from "@/components/gallery/GalleryLock";
import GalleryCover from "@/components/gallery/GalleryCover";
import GalleryHeader from "@/components/gallery/GalleryHeader";
import MediaTabs from "@/components/gallery/MediaTabs";
import Link from "next/link";
import { Camera, Download, Loader2 } from "lucide-react";

interface PublicGalleryClientProps {
    project: {
        id: string;
        name: string;
        slug: string;
        cloudAccountId: string;
        projectId?: string;
        rootFolderId: string;
        passwordProtected: boolean;
        downloadEnabled: boolean;
        downloadJpgEnabled: boolean;
        downloadRawEnabled: boolean;
        headerTitle?: string | null;
        headerFontFamily?: string | null;
        headerFontSize?: number | null;
        headerColor?: string | null;
        headerBackground?: string | null;
        headerImage?: string | null;
        headerImageFocus?: string | null;
        coverImage?: string | null;
        coverImageFocus?: string | null;
        videoFolderId?: string | null;
        enableVideoTab?: boolean | null;
        enableWatermark?: boolean;
        zipFileId?: string | null;
        planLimits?: {
            maxImagesPerProject: number | null;
            videoEnabled: boolean;
            lowResThumbnails: boolean;
            lowResDownloads: boolean;
            lowResMaxWidth: number;
            watermarkText: string | null;
            zipDownloadsEnabled: boolean | "static_only";
            hideBranding: boolean;
            galleryCover: boolean;
        } | null;
        user?: {
            businessName?: string | null;
            businessLogo?: string | null;
            businessWebsite?: string | null;
            theme?: string | null;
            businessLogoScale?: number | null;
            plan?: { name: string; config: any; } | null; // [DEBUG] Added for troubleshooting
        } | null;
    };
}

export default function PublicGalleryClient({ project }: PublicGalleryClientProps) {

    const [isLocked, setIsLocked] = useState(project.passwordProtected);
    // Hydration Fix: Initialize based on props only, effect update later
    const [showCover, setShowCover] = useState(!!project.coverImage && !!project.planLimits?.galleryCover);
    const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");
    const [tabMounted, setTabMounted] = useState(false);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);

    // Initial Cover Check (Client Only)
    useEffect(() => {
        if (project.coverImage && project.planLimits?.galleryCover) {
            const sessionCovered = sessionStorage.getItem(`gallery_covered_${project.slug}`);
            if (sessionCovered) {
                setShowCover(false);
            }
        }
    }, [project.coverImage, project.planLimits?.galleryCover, project.slug]);

    // Read from localStorage after mount to avoid SSR hydration flash
    useEffect(() => {
        const savedTab = localStorage.getItem(`gallery_tab_${project.slug}`);
        if (savedTab === "videos" && project.enableVideoTab) {
            setActiveTab("videos");
        }
        setTabMounted(true);
    }, [project.slug, project.enableVideoTab]);

    // Save tab preference when changed
    const handleTabChange = (tab: "photos" | "videos") => {
        setActiveTab(tab);
        localStorage.setItem(`gallery_tab_${project.slug}`, tab);
    };

    const handleEnterGallery = () => {
        setShowCover(false);
        sessionStorage.setItem(`gallery_covered_${project.slug}`, "true");
    };

    // Download ZIP using fetch + blob (same approach that works for individual images)
    const handleDownloadZip = async () => {
        if (!project.zipFileId || isDownloadingZip) return;

        setIsDownloadingZip(true);
        const fileName = project.name + '.zip';
        const directUrl = `/api/cloud/download-direct?c=${project.cloudAccountId}&f=${project.zipFileId}&n=${encodeURIComponent(fileName)}`;

        try {
            const res = await fetch(directUrl);
            if (!res.ok) throw new Error("Error en descarga: " + res.status);

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 2000);
        } catch (err: any) {
            console.error("Error descargando ZIP:", err);
            alert("Error al descargar: " + err.message);
        } finally {
            setIsDownloadingZip(false);
        }
    };

    useEffect(() => {
        // Check if it was already unlocked in this session
        if (project.passwordProtected) {
            const unlocked = sessionStorage.getItem(`gallery_unlocked_${project.slug}`);
            if (unlocked === "true") {
                setIsLocked(false);
            }
        }
    }, [project.passwordProtected, project.slug]);

    if (showCover && project.coverImage) {
        return (
            <GalleryCover
                coverImage={project.coverImage}
                coverImageFocus={project.coverImageFocus}
                fontSize={project.headerFontSize || 100}
                logo={project.user?.businessLogo}
                studioName={project.user?.businessName || "CloserLens Gallery"}
                projectName={project.name}
                onEnter={handleEnterGallery}
                cloudAccountId={project.cloudAccountId}
            />
        );
    }

    if (isLocked) {
        return (
            <GalleryLock
                slug={project.slug}
                projectName={project.name}
                onUnlock={() => setIsLocked(false)}
                logo={project.user?.businessLogo}
                studioName={project.user?.businessName || "CloserLens Gallery"}
            />
        );
    }

    // Determine which folder to load based on active tab
    // FIX: If videos tab is active but no video folder is set, do NOT fallback to rootFolderId (photos)
    // Return empty string to trigger empty state in viewer
    const currentFolderId =
        activeTab === "videos"
            ? (project.videoFolderId || "")
            : project.rootFolderId;

    // Get header configuration with fallbacks
    const headerTitle = project.headerTitle || project.name;
    const headerFontFamily = project.headerFontFamily || "Inter";
    const headerColor = project.headerColor || "#FFFFFF";
    const headerBackground = (project.headerBackground as "dark" | "light") || "dark";
    const showVideoTab = project.enableVideoTab || false;

    return (
        <div className={`relative min-h-screen transition-colors duration-500 ${headerBackground === 'light' ? 'bg-white' : 'bg-black'}`}>
            {/* Customizable Header */}
            <GalleryHeader
                title={headerTitle}
                fontFamily={headerFontFamily}
                fontSize={project.headerFontSize || 100}
                color={headerColor}
                background={headerBackground}
                logo={project.user?.businessLogo}
                coverImage={project.headerImage}
                coverImageFocus={project.headerImageFocus}
                cloudAccountId={project.cloudAccountId}
            />

            {/* Media Tabs (Photos/Videos) - hidden until mounted to avoid flash */}
            <div className={`transition-opacity duration-100 ${tabMounted ? 'opacity-100' : 'opacity-0'}`}>
                <MediaTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    showVideoTab={showVideoTab}
                    theme={headerBackground}
                />
            </div>

            {/* Gallery Viewer */}
            <GalleryViewer
                key={activeTab}
                cloudAccountId={project.cloudAccountId}
                folderId={currentFolderId}
                projectId={project.id} // Enforce manual order if set
                projectName={project.name}
                downloadEnabled={project.downloadEnabled}
                downloadJpgEnabled={project.downloadJpgEnabled}
                downloadRawEnabled={project.downloadRawEnabled}
                studioName={project.user?.businessName || "CloserLens"}
                studioLogo={project.user?.businessLogo || ""}
                studioLogoScale={project.user?.businessLogoScale || 100}
                theme={headerBackground}
                mediaType={activeTab}
                enableWatermark={project.enableWatermark || !!project.planLimits?.watermarkText}
                maxImages={project.planLimits?.maxImagesPerProject || null}
                watermarkText={project.planLimits?.watermarkText || null}
                lowResDownloads={!!project.planLimits?.lowResDownloads}
                lowResThumbnails={!!project.planLimits?.lowResThumbnails}
                zipDownloadsEnabled={project.planLimits?.zipDownloadsEnabled ?? true}
                zipFileId={project.zipFileId || null}
            />

            {/* Floating Download Button - Only shows when ZIP is available */}
            {project.zipFileId && project.downloadEnabled && (
                <button
                    onClick={handleDownloadZip}
                    disabled={isDownloadingZip}
                    className="fixed bottom-4 right-4 z-40 group disabled:opacity-70"
                >
                    <div className="relative flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 backdrop-blur-lg shadow-lg shadow-emerald-500/25 border border-emerald-400/30 hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-300 cursor-pointer">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />

                        {/* Icon */}
                        {isDownloadingZip ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                            <Download className="w-5 h-5 text-white" />
                        )}

                        {/* Text */}
                        <span className="text-white font-semibold text-sm tracking-wide">
                            {isDownloadingZip ? 'Descargando...' : 'Descargar Galería'}
                        </span>

                        {/* Subtle shine effect on hover */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden">
                            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[200%] transition-transform duration-1000" />
                        </div>
                    </div>
                </button>
            )}

            {/* Minimal branding */}
            {!project.planLimits?.hideBranding && (
                <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none z-30 opacity-50 hover:opacity-100 transition">
                    <Link
                        href="/"
                        className="pointer-events-auto flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur rounded-full text-xs text-white/50 hover:text-white border border-white/5"
                    >
                        <Camera className="w-3 h-3" />
                        <span>Powered by Closerlens</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
