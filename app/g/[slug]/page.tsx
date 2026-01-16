import React from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicGalleryClient from "@/components/gallery/PublicGalleryClient";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { getFreshGoogleAuth } from "@/lib/cloud/google-auth";

interface Props {
    params: Promise<{
        slug: string;
    }>;
}

// Ensure dynamic rendering
export const dynamic = "force-dynamic";

export default async function PublicGalleryPage({ params }: Props) {
    const { slug } = await params;

    const project = await prisma.project.findUnique({
        where: { slug },
        include: {
            user: {
                select: {
                    businessName: true,
                    businessLogo: true,
                    businessWebsite: true,
                    theme: true,
                    businessLogoScale: true,
                    plan: {
                        select: {
                            limits: true
                        }
                    }
                }
            }
        },
    });

    if (!project) {
        return notFound();
    }

    // Parse plan limits
    const planLimits = project.user?.plan?.limits
        ? JSON.parse(project.user.plan.limits)
        : null;

    // Check if video is enabled by plan (default: true if no plan)
    const planAllowsVideo = planLimits?.videoEnabled ?? true;

    // Use the user's explicit configuration for video tab visibility
    // But only if the plan allows video
    const enableVideoTab = planAllowsVideo && (project.enableVideoTab || false);
    let videoFolderId = project.videoFolderId || null;

    // Only auto-detect Videos folder if user explicitly enabled video tab but didn't configure a folder
    if (enableVideoTab && !videoFolderId) {
        try {
            const auth = await getFreshGoogleAuth(project.cloudAccountId);
            const provider = new GoogleDriveProvider();
            const subfolders = await provider.listFolders(project.rootFolderId, auth);

            // Look for "Videos" folder (case-insensitive)
            const videosFolder = subfolders.find(f => f.name.toLowerCase() === "videos");

            if (videosFolder) {
                videoFolderId = videosFolder.id;
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
        enableWatermark: project.enableWatermark || false,
        planLimits: planLimits ? {
            maxImagesPerProject: planLimits.maxImagesPerProject ?? null,
            videoEnabled: planLimits.videoEnabled ?? true,
            lowResDownloads: planLimits.lowResDownloads ?? false,
            lowResMaxWidth: planLimits.lowResMaxWidth ?? 0,
            watermarkText: planLimits.watermarkText ?? null,
        } : null
    };

    return (
        <PublicGalleryClient project={enhancedProject} />
    );
}

