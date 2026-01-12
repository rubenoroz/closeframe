"use client";

import React, { useState, useEffect } from "react";
import GalleryViewer from "@/components/gallery/GalleryViewer";
import GalleryLock from "@/components/gallery/GalleryLock";
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
        rootFolderId: string;
        passwordProtected: boolean;
        downloadEnabled: boolean;
        downloadJpgEnabled: boolean;
        downloadRawEnabled: boolean;
        headerTitle?: string | null;
        headerFontFamily?: string | null;
        headerColor?: string | null;
        headerBackground?: string | null;
        videoFolderId?: string | null;
        enableVideoTab?: boolean | null;
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
    const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");

    // Restore tab preference from localStorage
    useEffect(() => {
        const savedTab = localStorage.getItem(`gallery_tab_${project.slug}`);
        if (savedTab === "videos" && project.enableVideoTab) {
            setActiveTab("videos");
        }
    }, [project.slug, project.enableVideoTab]);

    // Save tab preference when changed
    const handleTabChange = (tab: "photos" | "videos") => {
        setActiveTab(tab);
        localStorage.setItem(`gallery_tab_${project.slug}`, tab);
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

    if (isLocked) {
        return (
            <GalleryLock
                slug={project.slug}
                projectName={project.name}
                onUnlock={() => setIsLocked(false)}
            />
        );
    }

    // Determine which folder to load based on active tab
    const currentFolderId =
        activeTab === "videos" && project.videoFolderId
            ? project.videoFolderId
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
                color={headerColor}
                background={headerBackground}
            />

            {/* Media Tabs (Photos/Videos) */}
            <MediaTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                showVideoTab={showVideoTab}
                theme={headerBackground}
            />

            {/* Gallery Viewer */}
            <GalleryViewer
                cloudAccountId={project.cloudAccountId}
                folderId={currentFolderId}
                projectName={project.name}
                downloadEnabled={project.downloadEnabled}
                downloadJpgEnabled={project.downloadJpgEnabled}
                downloadRawEnabled={project.downloadRawEnabled}
                studioName={project.user?.businessName || "Closeframe"}
                studioLogo={project.user?.businessLogo || ""}
                studioLogoScale={project.user?.businessLogoScale || 100}
                theme={headerBackground}
            />

            {/* Minimal branding */}
            <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none z-30 opacity-50 hover:opacity-100 transition">
                <Link
                    href="/"
                    className="pointer-events-auto flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur rounded-full text-xs text-white/50 hover:text-white border border-white/5"
                >
                    <Camera className="w-3 h-3" />
                    <span>Powered by Closeframe</span>
                </Link>
            </div>
        </div>
    );
}
