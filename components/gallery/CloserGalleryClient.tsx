"use client";

import React, { useState, useEffect, useMemo } from "react";
import GalleryViewer from "@/components/gallery/GalleryViewer";
import GalleryLock from "@/components/gallery/GalleryLock";
import GalleryCover from "@/components/gallery/GalleryCover";
import GalleryHeader from "@/components/gallery/GalleryHeader";
import MomentosBar from "@/components/gallery/MomentosBar";
import AudioPlayer from "@/components/gallery/AudioPlayer";
import { getTrackById } from "@/lib/music-library";
import { Loader2 } from "lucide-react";
import { CloudFile } from "@/types/cloud";

interface CloserGalleryClientProps {
    project: any;
    businessName?: string | null;
    businessLogo?: string | null;
    businessWebsite?: string | null;
    theme?: string | null;
    businessLogoScale?: number | null;
    plan?: any | null;
}

export default function CloserGalleryClient({
    project,
    businessName,
    businessLogo,
    businessWebsite,
    theme = "dark",
    businessLogoScale,
    plan
}: CloserGalleryClientProps) {
    const [isLocked, setIsLocked] = useState(project.passwordProtected);
    const [showCover, setShowCover] = useState(true);
    const [activeMomentoId, setActiveMomentoId] = useState<string | null>(null);
    const [momentos, setMomentos] = useState<{ id: string; name: string }[]>([]);
    const [isLoadingStructure, setIsLoadingStructure] = useState(true);

    // State for aggregated/fetched files
    const [galleryFiles, setGalleryFiles] = useState<CloudFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    // Audio/Video Coexistence State
    const [shouldPlay, setShouldPlay] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    const isMusicEnabled = !!project.musicTrackId;
    const musicTrack = isMusicEnabled ? getTrackById(project.musicTrackId) : null;

    // 1. Fetch Folder Structure (Momentos)
    useEffect(() => {
        const fetchStructure = async () => {
            try {
                // Fetch subfolders of the project root
                const res = await fetch(`/api/cloud/folders?cloudAccountId=${project.cloudAccountId}&folderId=${project.rootFolderId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.folders) {
                        // Filter out system folders
                        let validFolders = data.folders.filter((f: any) =>
                            !['webjpg', 'jpg', 'raw', 'print', 'highres'].includes(f.name.toLowerCase())
                        );

                        // [UPDATED] Apply manual folder order (Momentos) if exists
                        if ((project as any).momentsOrder && Array.isArray((project as any).momentsOrder) && (project as any).momentsOrder.length > 0) {
                            const momentsMap = new Map();
                            (project as any).momentsOrder.forEach((id: string, index: number) => momentsMap.set(id, index));

                            validFolders.sort((a: any, b: any) => {
                                const indexA = momentsMap.has(a.id) ? momentsMap.get(a.id) : 999999;
                                const indexB = momentsMap.has(b.id) ? momentsMap.get(b.id) : 999999;
                                return indexA - indexB; // Ordered first, then unordered
                            });
                        } else {
                            // Default alphabetical
                            validFolders.sort((a: any, b: any) => a.name.localeCompare(b.name));
                        }

                        setMomentos(validFolders);
                    }
                }
            } catch (error) {
                console.error("Error loading gallery structure:", error);
            } finally {
                setIsLoadingStructure(false);
            }
        };

        if (!isLocked) {
            fetchStructure();
        }
    }, [project.cloudAccountId, project.rootFolderId, isLocked]);

    // 2. Fetch Files when Momento Changes or on Initial Load
    useEffect(() => {
        if (isLocked || isLoadingStructure) return;

        const fetchContent = async () => {
            setIsLoadingFiles(true);
            try {
                let files: CloudFile[] = [];

                if (activeMomentoId) {
                    // Fetch single folder
                    const res = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${activeMomentoId}&projectId=${project.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        files = data.files || [];
                    }
                } else {
                    // Fetch Aggregated content
                    const rootRes = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${project.rootFolderId}&projectId=${project.id}`);
                    let rootFiles = [];
                    if (rootRes.ok) {
                        const data = await rootRes.json();
                        rootFiles = data.files || [];
                    }

                    const momentPromises = momentos.map(m =>
                        fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${m.id}&projectId=${project.id}`)
                            .then(r => r.ok ? r.json() : { files: [] })
                    );

                    const momentsData = await Promise.all(momentPromises);
                    const momentsFiles = momentsData.flatMap(d => d.files || []);

                    const allFilesMap = new Map();
                    [...rootFiles, ...momentsFiles].forEach(f => allFilesMap.set(f.id, f));
                    files = Array.from(allFilesMap.values());
                }

                // [UPDATED] Apply manual order globally (aggregated OR single folder)
                if (project.fileOrder && Array.isArray(project.fileOrder) && project.fileOrder.length > 0) {
                    const orderMap = new Map();
                    project.fileOrder.forEach((id: string, index: number) => orderMap.set(id, index));

                    files.sort((a, b) => {
                        const indexA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
                        const indexB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
                        return indexA - indexB;
                    });
                } else {
                    files.sort((a, b) => a.name.localeCompare(b.name));
                }

                setGalleryFiles(files);
            } catch (error) {
                console.error("Error loading content:", error);
            } finally {
                setIsLoadingFiles(false);
            }
        };

        fetchContent();
    }, [activeMomentoId, isLocked, isLoadingStructure, project.cloudAccountId, project.rootFolderId, momentos]);


    // Handlers
    const handleUnlock = () => setIsLocked(false);
    const handleEnter = () => {
        setShowCover(false);
        if (project.musicEnabled && !isLocked) {
            setShouldPlay(true);
        }
    };


    if (isLocked) {
        return (
            <GalleryLock
                slug={project.slug}
                projectName={project.name}
                logo={businessLogo}
                studioName={businessName || "Closer"}
                onUnlock={handleUnlock}
            />
        );
    }

    if (showCover) {
        return (
            <GalleryCover
                coverImage={project.coverImage}
                coverImageFocus={project.coverImageFocus}
                logo={businessLogo}
                studioName={businessName || "Closer"}
                projectName={project.headerTitle || project.name}
                onEnter={handleEnter}
                cloudAccountId={project.cloudAccountId}
                fontSize={project.headerFontSize}
            />
        );
    }

    // Determine config based on plan and project settings
    const effectiveDownloadEnabled = project.downloadEnabled;
    const effectiveZipEnabled = plan?.config?.zipDownloadsEnabled ?? false;

    return (
        <div className="bg-neutral-900 min-h-screen">
            {/* Standard Gallery Header */}
            <GalleryHeader
                title={project.headerTitle || project.name}
                fontFamily={project.headerFontFamily || "Inter"}
                fontSize={project.headerFontSize || 100}
                color={project.headerColor || "#FFFFFF"}
                background="dark" // Always dark for Closer
                logo={businessLogo}
                cloudAccountId={project.cloudAccountId}
                // Optional: We could use project.headerImage if we wanted a hero, 
                // but Closer usually is clean. Let's start clean or use headerImage if set.
                coverImage={project.headerImage}
                coverImageFocus={project.headerImageFocus}
            />

            {/* Momentos Navigation */}
            {momentos.length > 0 && (
                <MomentosBar
                    momentos={momentos}
                    activeMomentoId={activeMomentoId}
                    onMomentoChange={setActiveMomentoId}
                    theme="dark"
                />
            )}

            {/* Music Player */}
            {isMusicEnabled && musicTrack && (
                <AudioPlayer
                    trackUrl={musicTrack.url}
                    trackName={musicTrack.name}
                    autoPlay={project.musicEnabled === true}
                    forcePlay={shouldPlay}
                    externalVideoPlaying={isVideoPlaying}
                />
            )}

            {/* Main Gallery Viewer */}
            {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <Loader2 className="w-8 h-8 text-neutral-500 animate-spin mb-4" />
                    <p className="text-neutral-500 text-sm tracking-widest font-light uppercase">Cargando Momento...</p>
                </div>
            ) : (
                <GalleryViewer
                    cloudAccountId={project.cloudAccountId}
                    folderId={project.rootFolderId}

                    // Pass aggregated files
                    preloadedFiles={galleryFiles}

                    // Config
                    projectName={project.name}
                    studioName={businessName || "Closer"}
                    studioLogo={businessLogo || ""}
                    studioLogoScale={businessLogoScale || 100}
                    downloadEnabled={effectiveDownloadEnabled}
                    downloadJpgEnabled={project.downloadJpgEnabled}
                    downloadRawEnabled={project.downloadRawEnabled}
                    enableWatermark={project.enableWatermark}
                    watermarkText={businessName}
                    zipDownloadsEnabled={effectiveZipEnabled}
                    zipFileId={project.zipFileId}

                    theme="dark"
                    className="pt-0"

                    // Video Events
                    onVideoPlay={() => setIsVideoPlaying(true)}
                    onVideoPause={() => setIsVideoPlaying(false)}
                />
            )}
        </div>
    );
}
