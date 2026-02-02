"use client";

import React, { useState, useEffect, useMemo } from "react";
import GalleryViewer from "@/components/gallery/GalleryViewer";
import GalleryLock from "@/components/gallery/GalleryLock";
import GalleryCover from "@/components/gallery/GalleryCover";
import GalleryHeader from "@/components/gallery/GalleryHeader";
import MomentosBar from "@/components/gallery/MomentosBar";
import AudioPlayer from "@/components/gallery/AudioPlayer";
import { getTrackById } from "@/lib/music-library";
import GalleryLoaderGrid from "@/components/gallery/GalleryLoaderGrid";
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
    collaborativeSections?: { id: string; name: string; driveFolderId: string }[];
    debugMessage?: string;
    structure?: any;
}

export default function CloserGalleryClient({
    project,
    businessName,
    businessLogo,
    businessWebsite,
    theme = "dark",
    businessLogoScale,
    plan,
    collaborativeSections,
    debugMessage
}: CloserGalleryClientProps) {
    const [isLocked, setIsLocked] = useState(project.passwordProtected);
    const [showCover, setShowCover] = useState(true);
    // [UPDATED] Start with 'all' if we have collaborative sections
    const [activeMomentoId, setActiveMomentoId] = useState<string | null>(collaborativeSections && collaborativeSections.length > 0 ? 'all' : null);
    const [photographerMomentos, setPhotographerMomentos] = useState<{ id: string; name: string }[]>([]);
    const [collaborativeMomentos, setCollaborativeMomentos] = useState<{ id: string; name: string }[]>([]);
    const [isLoadingStructure, setIsLoadingStructure] = useState(true);

    // State for aggregated/fetched files
    const [galleryFiles, setGalleryFiles] = useState<CloudFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    // Audio/Video Coexistence State
    const [shouldPlay, setShouldPlay] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    // Search state
    const [searchTerm, setSearchTerm] = useState("");

    const isMusicEnabled = !!project.musicTrackId;
    const musicTrack = isMusicEnabled ? getTrackById(project.musicTrackId) : null;

    // 3. Derived Momentos with Virtual Video Chip (for photographer momentos only)
    const displayPhotographerMomentos = useMemo(() => {
        if (!project.enableVideoTab) return photographerMomentos;
        return [
            ...photographerMomentos,
            { id: "videos-virtual", name: "Videos" }
        ];
    }, [photographerMomentos, project.enableVideoTab]);

    const isVideoTabActive = activeMomentoId === "videos-virtual";

    // 1. Fetch Both: Folder Structure AND Collaborative Sections
    useEffect(() => {
        const sections = project.collaborativeSections;

        // Set collaborative sections if available
        if (sections && sections.length > 0) {
            console.log("[CloserGallery] Setting collaborative sections:", sections);
            setCollaborativeMomentos(
                sections.map((s: any) => ({ id: s.driveFolderId, name: s.name }))
            );
        }

        // Fetch photographer folders from Drive
        const fetchStructure = async () => {
            // ... (Existing recursive logic as fallback) ...
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

                        // ... sort ...
                        setPhotographerMomentos(validFolders);
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
    }, [project.cloudAccountId, project.rootFolderId, isLocked, project.collaborativeSections]);

    // 2. Fetch Files
    useEffect(() => {
        if (isLocked || isLoadingStructure) return;

        // Clear old files immediately when momento changes
        setGalleryFiles([]);

        // Stale flag to prevent race conditions
        let isStale = false;

        const fetchContent = async () => {
            setIsLoadingFiles(true);
            try {
                let files: CloudFile[] = [];

                // [NEW] Special handling for 'Todos' (null or 'all') - fetch EVERYTHING
                const sections = project.collaborativeSections;

                if (activeMomentoId === null || activeMomentoId === 'all') {
                    // Fetch Root folder
                    const rootRes = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${project.rootFolderId}&projectId=${project.id}`);
                    let rootFiles: CloudFile[] = [];
                    if (rootRes.ok) {
                        const data = await rootRes.json();
                        rootFiles = data.files || [];
                    }

                    // Fetch all photographer momentos
                    const photographerPromises = photographerMomentos.map((m: { id: string; name: string }) =>
                        fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${m.id}&projectId=${project.id}`)
                            .then(r => r.ok ? r.json() : { files: [] })
                    );
                    const photographerData = await Promise.all(photographerPromises);
                    const photographerFiles = photographerData.flatMap((d: any) => d.files || []);

                    // Fetch collaborative sections (if any)
                    let sectionFiles: CloudFile[] = [];
                    if (sections && sections.length > 0) {
                        const sectionPromises = sections.map((s: any) =>
                            fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${s.driveFolderId}&projectId=${project.id}`)
                                .then(r => r.ok ? r.json() : { files: [] })
                        );
                        const sectionsData = await Promise.all(sectionPromises);
                        sectionFiles = sectionsData.flatMap((d: any) => d.files || []);
                    }

                    // Deduplicate all sources
                    const allMap = new Map();
                    [...rootFiles, ...photographerFiles, ...sectionFiles].forEach(f => allMap.set(f.id, f));
                    files = Array.from(allMap.values());
                }
                else if (activeMomentoId === 'videos-virtual') {
                    // Find the physical Videos folder from photographerMomentos
                    console.log("[DEBUG] photographerMomentos:", photographerMomentos);
                    const videoFolder = photographerMomentos.find(
                        (m: { id: string; name: string }) => m.name.toLowerCase() === 'videos'
                    );
                    console.log("[DEBUG] Found videoFolder:", videoFolder);
                    if (videoFolder) {
                        // CloserLens structure: Videos folder has subfolders (alta, hd, webmp4)
                        // We need to fetch from the "webmp4" subfolder
                        const foldersRes = await fetch(`/api/cloud/folders?cloudAccountId=${project.cloudAccountId}&folderId=${videoFolder.id}`);
                        console.log("[DEBUG] Fetching subfolders from:", videoFolder.id);
                        if (foldersRes.ok) {
                            const foldersData = await foldersRes.json();
                            console.log("[DEBUG] Subfolders:", foldersData.folders);
                            const webmp4Folder = foldersData.folders?.find((f: any) =>
                                f.name.toLowerCase() === 'webmp4'
                            );
                            console.log("[DEBUG] Found webmp4Folder:", webmp4Folder);

                            if (webmp4Folder) {
                                // Fetch videos from webmp4 subfolder
                                const res = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${webmp4Folder.id}&projectId=${project.id}`);
                                if (res.ok) {
                                    const data = await res.json();
                                    console.log("[DEBUG] Videos files:", data.files?.length);
                                    files = data.files || [];
                                }
                            } else {
                                // Fallback: try fetching directly from Videos folder
                                const res = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${videoFolder.id}&projectId=${project.id}`);
                                if (res.ok) {
                                    const data = await res.json();
                                    files = data.files || [];
                                }
                            }
                        }
                    } else {
                        console.log("[DEBUG] No Videos folder found in photographerMomentos!");
                    }
                }
                else if (activeMomentoId) {
                    // Fetch single folder (Momento or Section)
                    const res = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${activeMomentoId}&projectId=${project.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        files = data.files || [];
                    }
                } else if (!sections || sections.length === 0) {
                    // Legacy Aggregated Default (if no active momento selected and not collaborative)
                    // ... (Existing aggregated logic) ...
                    const rootRes = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${project.rootFolderId}&projectId=${project.id}`);
                    let rootFiles = [];
                    if (rootRes.ok) {
                        const data = await rootRes.json();
                        rootFiles = data.files || [];
                    }
                    // Fetch all momentos (photographer + collaborative)
                    const allMomentos = [...photographerMomentos, ...collaborativeMomentos];
                    const momentPromises = allMomentos.map((m: { id: string; name: string }) =>
                        fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${m.id}&projectId=${project.id}`)
                            .then(r => r.ok ? r.json() : { files: [] })
                    );
                    const momentsData = await Promise.all(momentPromises);
                    const momentsFiles = momentsData.flatMap((d: any) => d.files || []);

                    const allFilesMap = new Map();
                    [...rootFiles, ...momentsFiles].forEach(f => allFilesMap.set(f.id, f));
                    files = Array.from(allFilesMap.values());
                }

                // ... Sort and Set ...
                if (project.fileOrder && Array.isArray(project.fileOrder) && project.fileOrder.length > 0) {
                    // ... sort logic ...
                } else {
                    files.sort((a, b) => a.name.localeCompare(b.name));
                }

                // Strict filtering: If in video tab, ONLY allow videos
                if (activeMomentoId === 'videos-virtual') {
                    const videoCountBefore = files.length;

                    // Debug non-videos
                    const nonVideos = files.filter(f => !f.mimeType?.startsWith('video/'));
                    if (nonVideos.length > 0) {
                        console.log("[DEBUG] Found non-video files in video tab:", nonVideos.slice(0, 3).map(f => ({ name: f.name, mime: f.mimeType })));
                    }

                    // Filter by mimeType OR extension (for robustness)
                    files = files.filter(f =>
                        f.mimeType?.startsWith('video/') ||
                        /\.(mp4|mov|avi|webm|m4v)$/i.test(f.name)
                    );

                    console.log(`[CloserGallery] Filtered non-videos: ${videoCountBefore} -> ${files.length}`);
                }

                // Only update state if this fetch is still current (not stale)
                if (!isStale) {
                    console.log("[CloserGallery] Setting galleryFiles:", files.length, "files for momento:", activeMomentoId);
                    if (files.length > 0) {
                        console.log("[CloserGallery] First 5 files:", files.slice(0, 5).map(f => ({ name: f.name, mimeType: f.mimeType })));
                    }
                    setGalleryFiles(files);
                } else {
                    console.log("[CloserGallery] Skipping stale fetch result:", files.length, "files");
                }

            } catch (error) {
                console.error("Error loading content:", error);
            } finally {
                if (!isStale) {
                    setIsLoadingFiles(false);
                }
            }
        };
        fetchContent();

        // Cleanup: mark this fetch as stale when activeMomentoId changes
        return () => {
            isStale = true;
        };
    }, [activeMomentoId, isLocked, isLoadingStructure, collaborativeSections]);



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

            {/* Single Merged Navigation Bar */}
            {(() => {
                // Merge photographer + collaborative, filter out:
                // - "Uploads" folders (collaborative root)
                // - Physical "Videos" folders (we use virtual chip instead, id = "videos-virtual")
                const allMomentos = [
                    ...displayPhotographerMomentos.filter((m: { id: string; name: string }) =>
                        !m.name.toLowerCase().includes('uploads') &&
                        !(m.name.toLowerCase() === 'videos' && m.id !== 'videos-virtual')
                    ),
                    ...collaborativeMomentos
                ];

                if (allMomentos.length === 0) return null;

                return (
                    <MomentosBar
                        momentos={allMomentos}
                        activeMomentoId={activeMomentoId}
                        onMomentoChange={setActiveMomentoId}
                        theme="dark"
                        totalCount={isLoadingFiles ? undefined : galleryFiles.length}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                    />
                );
            })()}

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
                <GalleryLoaderGrid theme="dark" />
            ) : (
                <GalleryViewer
                    key={`gallery-${activeMomentoId || 'todos'}`}
                    cloudAccountId={project.cloudAccountId}
                    folderId={isVideoTabActive ? (project.videoFolderId || "") : project.rootFolderId}
                    projectId={project.id}

                    // Pass aggregated files (filtered by search if active)
                    preloadedFiles={searchTerm
                        ? galleryFiles.filter(f =>
                            f.name.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        : galleryFiles
                    }

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
                    layoutType={isVideoTabActive ? "grid" : project.layoutType}

                    theme="dark"
                    mediaType={isVideoTabActive ? "videos" : "photos"}
                    className="pt-0"

                    // Video Events
                    onVideoPlay={() => setIsVideoPlaying(true)}
                    onVideoPause={() => setIsVideoPlaying(false)}
                />
            )}
        </div>
    );
}
