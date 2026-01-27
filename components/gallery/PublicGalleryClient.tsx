"use client";

import React, { useState, useEffect } from "react";
import GalleryViewer from "@/components/gallery/GalleryViewer";
import GalleryLock from "@/components/gallery/GalleryLock";
import GalleryCover from "@/components/gallery/GalleryCover";
import GalleryHeader from "@/components/gallery/GalleryHeader";
import MediaTabs from "@/components/gallery/MediaTabs";
import Link from "next/link";
import { Camera } from "lucide-react";

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
        planLimits?: {
            maxImagesPerProject: number | null;
            videoEnabled: boolean;
            lowResThumbnails: boolean;
            lowResDownloads: boolean;
            lowResMaxWidth: number;
            watermarkText: string | null;
            zipDownloadsEnabled: boolean;
            hideBranding: boolean;
            galleryCover: boolean;
        } | null;
        user?: {
            businessName?: string | null;
            businessLogo?: string | null;
            businessWebsite?: string | null;
            theme?: string | null;
            businessLogoScale?: number | null;
        } | null;
    };
}

export default function PublicGalleryClient({ project }: PublicGalleryClientProps) {

    const [isLocked, setIsLocked] = useState(project.passwordProtected);
    // Hydration Fix: Initialize based on props only, effect update later
    const [showCover, setShowCover] = useState(!!project.coverImage && !!project.planLimits?.galleryCover);
    const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");
    const [tabMounted, setTabMounted] = useState(false);

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
                zipDownloadsEnabled={project.planLimits?.zipDownloadsEnabled !== false} // Default true if undefined
            />

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
