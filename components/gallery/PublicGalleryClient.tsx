"use client";

import React, { useState, useEffect } from "react";
import GalleryViewer from "@/components/gallery/GalleryViewer";
import GalleryLock from "@/components/gallery/GalleryLock";
import GalleryCover from "@/components/gallery/GalleryCover";
import GalleryHeader from "@/components/gallery/GalleryHeader";
import MediaTabs from "@/components/gallery/MediaTabs";
import CloserGalleryClient from "@/components/gallery/CloserGalleryClient";
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
        date?: string | null; // [NEW]
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
        layoutType?: "mosaic" | "grid";

        // Closer Gallery Props
        isCloserGallery?: boolean;
        musicTrackId?: string | null;
        musicEnabled?: boolean;

        // [NEW] Collaborative Sections
        collaborativeSections?: { id: string; name: string; driveFolderId: string }[];
        collaborativeGalleryId?: string;

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
            username?: string | null;
        } | null;
    };
}

export default function PublicGalleryClient({ project }: PublicGalleryClientProps) {

    // [NEW] Redirect to Closer Gallery experience if active
    if (project.isCloserGallery) {
        return (
            <CloserGalleryClient
                project={project}
                businessName={project.user?.businessName}
                businessLogo={project.user?.businessLogo}
                businessWebsite={project.user?.businessWebsite}
                theme={project.user?.theme}
                businessLogoScale={project.user?.businessLogoScale}
                plan={project.user?.plan}
                profileUrl={project.user?.username ? `/u/${project.user.username}` : undefined}
            />
        );
    }


    const [isLocked, setIsLocked] = useState(project.passwordProtected);
    // Hydration Fix: Initialize based on props only, effect update later
    const [showCover, setShowCover] = useState(!!project.coverImage && !!project.planLimits?.galleryCover);
    const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");
    const [tabMounted, setTabMounted] = useState(false);

    // [NEW] Collaborative Filtering State
    const [activeSectionId, setActiveSectionId] = useState<string>("all");
    const [collaborativeFiles, setCollaborativeFiles] = useState<any[]>([]);
    const [isLoadingCollaborative, setIsLoadingCollaborative] = useState(false);

    // [NEW] Fetch Collaborative Content
    useEffect(() => {
        if (!project.collaborativeSections || project.collaborativeSections.length === 0) return;

        const fetchCollaborativeContent = async () => {
            setIsLoadingCollaborative(true);
            try {
                // Fetch root files (General)
                const rootRes = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${project.rootFolderId}`);
                let rootFiles = [];
                if (rootRes.ok) {
                    const data = await rootRes.json();
                    rootFiles = data.files || [];
                }

                // Fetch section files
                const sectionPromises = project.collaborativeSections!.map(section =>
                    fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${section.driveFolderId}`)
                        .then(r => r.ok ? r.json() : { files: [] })
                        .then(data => ({
                            sectionId: section.id,
                            files: (data.files || []).map((f: any) => ({ ...f, sectionId: section.id }))
                        }))
                );

                const sectionsData = await Promise.all(sectionPromises);
                const allSectionFiles = sectionsData.flatMap(d => d.files);

                // Combine unique files (prefer section attribution if duplicate)
                const allFilesMap = new Map();
                [...rootFiles, ...allSectionFiles].forEach(f => allFilesMap.set(f.id, f));

                setCollaborativeFiles(Array.from(allFilesMap.values()));
            } catch (error) {
                console.error("Error loading collaborative content:", error);
            } finally {
                setIsLoadingCollaborative(false);
            }
        };

        fetchCollaborativeContent();
    }, [project.collaborativeSections, project.cloudAccountId, project.rootFolderId]);

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
                date={project.date} // [NEW]
                fontFamily={project.headerFontFamily || "Inter"} // [NEW]
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
                profileUrl={project.user?.username ? `/u/${project.user.username}` : undefined}
                coverImage={project.headerImage}
                coverImageFocus={project.headerImageFocus}
                cloudAccountId={project.cloudAccountId}
                date={project.date} // [NEW]
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

            {/* [NEW] Section Filters (Pills) */}
            {project.collaborativeSections && project.collaborativeSections.length > 0 && activeTab === 'photos' && (
                <div className="flex justify-center px-4 pb-4">
                    <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 no-scrollbar">
                        <button
                            onClick={() => setActiveSectionId("all")}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeSectionId === "all"
                                ? (headerBackground === 'light' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900')
                                : (headerBackground === 'light' ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200' : 'bg-white/10 text-neutral-400 hover:bg-white/20')
                                }`}
                        >
                            Todos
                        </button>
                        {project.collaborativeSections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSectionId(section.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeSectionId === section.id
                                    ? (headerBackground === 'light' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900')
                                    : (headerBackground === 'light' ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200' : 'bg-white/10 text-neutral-400 hover:bg-white/20')
                                    }`}
                            >
                                {section.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Gallery Viewer */}
            {isLoadingCollaborative && project.collaborativeSections && project.collaborativeSections.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className={`w-8 h-8 animate-spin ${headerBackground === 'light' ? 'text-neutral-900' : 'text-white'}`} />
                    <p className={`mt-2 text-sm ${headerBackground === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>Cargando fotos...</p>
                </div>
            ) : (
                <GalleryViewer
                    key={activeTab}
                    cloudAccountId={project.cloudAccountId}
                    folderId={currentFolderId}
                    projectId={project.id} // Enforce manual order if set
                    projectName={project.name}

                    // [NEW] Pass filtered files if collaborative mode
                    preloadedFiles={
                        project.collaborativeSections && project.collaborativeSections.length > 0 && activeTab === 'photos'
                            ? (activeSectionId === 'all'
                                ? collaborativeFiles
                                : collaborativeFiles.filter(f => f.sectionId === activeSectionId))
                            : undefined
                    }

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
                    layoutType={project.layoutType}
                />
            )}



            {/* Minimal branding */}
            {!project.planLimits?.hideBranding && (
                <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none z-30 opacity-50 hover:opacity-100 transition">
                    <Link
                        href="https://www.closerlens.com"
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
