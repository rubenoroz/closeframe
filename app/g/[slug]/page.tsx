import React from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicGalleryClient from "@/components/gallery/PublicGalleryClient";
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
                    featureOverrides: true,
                    plan: {
                        select: {
                            name: true,
                            config: true // Fetch New Modular Config
                        }
                    }
                }
            }
        },
    });

    if (!project) {
        return notFound();
    }

    // Calculate Effective Config server-side
    const effectiveConfig = getEffectivePlanConfig(
        project.user?.plan?.config || project.user?.plan?.name,
        project.user?.featureOverrides
    );

    // Check if video is enabled by plan
    const planAllowsVideo = effectiveConfig.features?.videoGallery ?? false;

    // Use the user's explicit configuration for video tab visibility
    // But only if the plan allows video
    const enableVideoTab = planAllowsVideo && (project.enableVideoTab || false);
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

    return (
        <PublicGalleryClient project={enhancedProject} />
    );
}

