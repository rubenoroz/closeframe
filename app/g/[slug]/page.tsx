import React from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicGalleryClient from "@/components/gallery/PublicGalleryClient";
import GalleryBlocked from "@/components/gallery/GalleryBlocked";
import { GoogleDriveProvider } from "@/lib/cloud/google-drive-provider";
import { getFreshGoogleAuth } from "@/lib/cloud/google-auth";
import { Metadata } from "next";

interface Props {
    params: Promise<{
        slug: string;
    }>;
}

// Ensure dynamic rendering
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const project = await prisma.project.findUnique({
        where: { slug },
        select: {
            name: true,
            headerTitle: true,
            user: {
                select: {
                    businessName: true,
                    businessLogo: true,
                }
            }
        }
    });

    if (!project) return { title: "Galería no encontrada" };

    const title = `${project.headerTitle || project.name} - ${project.user?.businessName || "Closerlens"}`;
    const description = `Galería fotográfica de ${project.user?.businessName || "Closerlens"}`;
    const logoUrl = project.user?.businessLogo || "https://www.closerlens.com/og-image.png";

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: logoUrl,
                    width: 800,
                    height: 800,
                    alt: title,
                }
            ],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [logoUrl],
        },
    };
}

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
                    },
                    username: true
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

    // Calculate Effective Features server-side
    const { getEffectiveFeatures } = await import("@/lib/features/service");
    const features = await getEffectiveFeatures(project.userId);

    // Check if this project exceeds the user's plan limit
    const val = features.maxProjects;
    const maxProjects = typeof val === 'number' ? val : -1;
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
    const planAllowsVideo = !!features.videoGallery;

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

    // [NEW] Fetch Collaborative Gallery Sections if enabled
    let collaborativeSections: { id: string; name: string; driveFolderId: string }[] = [];
    let collaborativeGalleryId = null;
    let debugMessage = "Init";

    const isCollaborativeEnabled = !!features.collaborativeGalleries;
    debugMessage += ` | Enabled: ${isCollaborativeEnabled} | ${Date.now()}`;

    try {
        if (isCollaborativeEnabled) {
            const collabGallery = await prisma.collaborativeGallery.findUnique({
                where: { projectId: project.id },
                include: {
                    sections: {
                        where: { isActive: true },
                        select: { id: true, name: true, driveFolderId: true }
                    }
                }
            });

            if (collabGallery) {
                debugMessage += ` | ValidGallery: ${collabGallery.id}`;
                if (collabGallery.isActive) {
                    collaborativeGalleryId = collabGallery.id;
                    collaborativeSections = collabGallery.sections;
                    debugMessage += ` | SECTIONS: ${collabGallery.sections.length}`;
                }
            } else {
                debugMessage += " | NoGalleryFound";
            }
        }
    } catch (e: any) {
        debugMessage += ` | ERROR: ${e.message}`;
    }

    // Create enhanced project object with detected video folder and plan limits
    const enhancedProject = {
        ...project,
        enableVideoTab,
        videoFolderId,
        externalVideos,
        collaborativeSections, // Pass sections to client
        collaborativeGalleryId,
        enableWatermark: project.enableWatermark || false,
        planLimits: {
            maxImagesPerProject: features.maxImagesPerProject ?? null,
            videoEnabled: !!features.videoGallery,
            lowResDownloads: !!features.lowResDownloads,
            lowResThumbnails: !!features.lowResThumbnails,
            zipDownloadsEnabled: features.zipDownloadsEnabled ?? true,
            lowResMaxWidth: features.lowResMaxWidth ?? 0,
            watermarkText: features.watermarkText ?? null,
            hideBranding: !!features.hideBranding,
            galleryCover: !!features.galleryCover,
        }
    };

    // [CLOSER GALLERY LOGIC]
    // If project is marked as Closer Gallery AND plan allows it
    if (project.isCloserGallery && features.closerGallery) {
        // Fetch Closer Gallery Structure (Momentos)
        const { GalleryIndexer } = await import("@/lib/gallery/indexer");
        const indexer = new GalleryIndexer();

        try {
            const structure = await indexer.indexGallery(project.cloudAccountId, project.rootFolderId, project.id);

            // Import Client Component dynamically or directly
            const { default: CloserGalleryClient } = await import("@/components/gallery/CloserGalleryClient");

            return (
                <CloserGalleryClient
                    project={enhancedProject}
                    structure={structure}
                    // studioProfile={project.user} // REMOVED - Incompatible
                    businessName={project.user?.businessName}
                    businessLogo={project.user?.businessLogo}
                    businessWebsite={project.user?.businessWebsite}
                    theme={project.user?.theme}
                    businessLogoScale={project.user?.businessLogoScale}

                    collaborativeSections={collaborativeSections}
                    debugMessage={"HARDCODED_TEST_" + Date.now()}
                    plan={project.user.plan}
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

