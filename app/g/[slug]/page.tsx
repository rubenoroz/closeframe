import React from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicGalleryClient from "@/components/gallery/PublicGalleryClient";
import GalleryBlocked from "@/components/gallery/GalleryBlocked";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { getFreshGoogleAuth } from "@/lib/cloud/google-auth";
import { getEffectivePlanConfig } from "@/lib/plans.config";

interface Props {
    params: Promise<{
        slug: string;
    }>;
}

// Ensure dynamic rendering
export const dynamic = "force-dynamic";

export default async function PublicGalleryPage({ params }: Props) {
    const { slug } = await params;

    const project = await (prisma.project as any).findUnique({
        where: { slug },
        include: {
            user: {
                select: {
                    businessName: true,
                    businessLogo: true,
                    businessWebsite: true,
                    theme: true,
                    businessLogoScale: true,
                    featureOverrides: true,
                    plan: {
                        select: {
                            name: true,
                            config: true
                        }
                    }
                }
            }
        },
    });

    if (!project) {
        return notFound();
    }

    // Fetch external videos separately to work around out-of-sync types
    const externalVideos = await (prisma as any).externalVideo.findMany({
        where: { projectId: project.id }
    });

    // Calculate Effective Config server-side
    const effectiveConfig = getEffectivePlanConfig(
        project.user?.plan?.config || project.user?.plan?.name,
        project.user?.featureOverrides
    );

    // Check if this project exceeds the user's plan limit
    const maxProjects = effectiveConfig.limits?.maxProjects ?? -1;
    if (maxProjects > 0) {
        // Get the oldest N projects that are allowed (by creation date)
        const allowedProjects = await prisma.project.findMany({
            where: { userId: project.userId },
            orderBy: { createdAt: 'asc' },
            take: maxProjects,
            select: { id: true }
        });

        const isAllowed = allowedProjects.some(p => p.id === project.id);
        if (!isAllowed) {
            // This project exceeds the plan limit - show blocked page
            return (
                <GalleryBlocked
                    studioName={project.user?.businessName || undefined}
                    studioLogo={project.user?.businessLogo || undefined}
                />
            );
        }
    }

    // Check if video is enabled by plan
    const planAllowsVideo = effectiveConfig.features?.videoGallery ?? false;

    // Use the user's explicit configuration
    // But only if the plan allows video
    const enableVideoTab = planAllowsVideo && !!project.enableVideoTab;
    let videoFolderId = project.videoFolderId || null;

    // Only auto-detect Videos folder if user explicitly enabled video tab but didn't configure a folder
    if (enableVideoTab && !videoFolderId) {
        try {
            // Get cloud account to know provider
            const cloudAccount = await prisma.cloudAccount.findUnique({
                where: { id: project.cloudAccountId }
            });

            if (cloudAccount) {
                const { getFreshAuth } = await import("@/lib/cloud/auth-factory");
                const authClient = await getFreshAuth(project.cloudAccountId);
                let provider;

                if (cloudAccount.provider === "microsoft") {
                    const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
                    provider = new MicrosoftGraphProvider(authClient as string);
                } else {
                    provider = new GoogleDriveProvider();
                }

                // @ts-ignore
                const subfolders = await provider.listFolders(project.rootFolderId, authClient);

                // Look for "Videos" folder (case-insensitive)
                const videosFolder = subfolders.find((f: any) => f.name.toLowerCase() === "videos");

                if (videosFolder) {
                    videoFolderId = videosFolder.id;
                }
            }
        } catch (error) {
            console.error("Error detecting Videos folder:", error);
            // Silently fail - just don't show video tab
        }
    }

    // Create enhanced project object with detected video folder and plan limits
    const enhancedProject = {
        ...project,
        enableVideoTab,
        videoFolderId,
        externalVideos, // [NEW] Pass videos to client
        enableWatermark: project.enableWatermark || false,
        planLimits: {
            maxImagesPerProject: effectiveConfig.limits?.maxImagesPerProject ?? null,
            videoEnabled: effectiveConfig.features?.videoGallery ?? false,
            lowResDownloads: effectiveConfig.features?.lowResDownloads ?? false,
            lowResThumbnails: effectiveConfig.features?.lowResThumbnails ?? false,
            zipDownloadsEnabled: effectiveConfig.features?.zipDownloadsEnabled ?? true,
            lowResMaxWidth: effectiveConfig.limits?.lowResMaxWidth ?? 0,
            watermarkText: effectiveConfig.limits?.watermarkText ?? null,
            hideBranding: effectiveConfig.features?.hideBranding ?? false,
            galleryCover: effectiveConfig.features?.galleryCover ?? false,
        }
    };

    // [CLOSER GALLERY LOGIC]
    // If project is marked as Closer Gallery AND plan allows it
    if (project.isCloserGallery && effectiveConfig.features?.closerGallery) {
        // Fetch Closer Gallery Structure (Momentos)
        const { GalleryIndexer } = await import("@/lib/gallery/indexer");
        const indexer = new GalleryIndexer();

        try {
            const structure = await indexer.indexGallery(project.cloudAccountId, project.rootFolderId, project.id);

            // Import Client Component dynamically or directly
            const { default: CloserGalleryClient } = await import("@/components/closer/CloserGalleryClient");

            return (
                <CloserGalleryClient
                    project={enhancedProject}
                    structure={structure}
                    studioProfile={project.user}
                />
            );
        } catch (error) {
            console.error("Error indexing Closer Gallery:", error);
            // Fallback to standard gallery if indexing fails? Or show error?
            // For now, let's fallback to standard to avoid white screen, or simple error page.
            // But usually this means Drive issues.
        }
    }

    return (
        <PublicGalleryClient project={enhancedProject} />
    );
}

