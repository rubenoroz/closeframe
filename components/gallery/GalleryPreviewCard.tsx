"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";

interface GalleryPreviewCardProps {
    project: {
        id: string;
        name: string;
        slug: string;
        coverImage?: string | null;
        cloudAccountId: string;
        rootFolderId: string;
    };
    isLight: boolean;
}

interface PreviewFile {
    id: string;
    name: string;
    thumbnailUrl: string;
}

export default function GalleryPreviewCard({ project, isLight }: GalleryPreviewCardProps) {
    const [previews, setPreviews] = useState<PreviewFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPreviews = async () => {
            try {
                // First, find the webjpg folder
                const foldersRes = await fetch(`/api/cloud/folders?cloudAccountId=${project.cloudAccountId}&parentId=${project.rootFolderId}`);
                if (!foldersRes.ok) {
                    setLoading(false);
                    return;
                }

                const foldersData = await foldersRes.json();
                const webjpgFolder = foldersData.folders?.find((f: any) =>
                    f.name.toLowerCase() === 'webjpg' || f.name.toLowerCase() === 'web'
                );

                const targetFolderId = webjpgFolder?.id || project.rootFolderId;

                // Fetch files from the target folder
                const res = await fetch(`/api/cloud/files?cloudAccountId=${project.cloudAccountId}&folderId=${targetFolderId}`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter only image files and get thumbnails
                    const imageFiles = data.files?.filter((file: any) =>
                        file.mimeType?.startsWith('image/') ||
                        /\.(jpg|jpeg|png|webp)$/i.test(file.name)
                    ) || [];

                    const previewFiles: PreviewFile[] = imageFiles.slice(0, 4).map((file: any) => ({
                        id: file.id,
                        name: file.name,
                        thumbnailUrl: `/api/cloud/thumbnail?c=${project.cloudAccountId}&f=${file.id}&s=400`
                    }));
                    setPreviews(previewFiles);
                }
            } catch (error) {
                console.error("Error fetching previews:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPreviews();
    }, [project.cloudAccountId, project.rootFolderId]);

    const previewCount = previews.length;

    // Render different grid layouts based on number of photos
    const renderGrid = () => {
        if (previewCount >= 4) {
            // Grid Type C: 1 large (left) + 3 small (right column)
            return (
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0.5">
                    {/* Main large image - spans 2 cols and 3 rows */}
                    <div className="col-span-2 row-span-3 overflow-hidden">
                        <img
                            src={previews[0].thumbnailUrl}
                            alt={previews[0].name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                    {/* 3 small images on the right */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="overflow-hidden">
                            <img
                                src={previews[i].thumbnailUrl}
                                alt={previews[i].name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                    ))}
                </div>
            );
        } else if (previewCount === 3) {
            // Grid Type A: 1 large (left) + 2 small (right)
            return (
                <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-0.5">
                    {/* Main large image - spans 2 cols and 2 rows */}
                    <div className="col-span-2 row-span-2 overflow-hidden">
                        <img
                            src={previews[0].thumbnailUrl}
                            alt={previews[0].name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                    {/* 2 small images on the right */}
                    <div className="overflow-hidden">
                        <img
                            src={previews[1].thumbnailUrl}
                            alt={previews[1].name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                    <div className="overflow-hidden">
                        <img
                            src={previews[2].thumbnailUrl}
                            alt={previews[2].name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                </div>
            );
        } else if (previewCount === 2) {
            // Grid Type B: 2 images side by side (top/bottom)
            return (
                <div className="w-full h-full grid grid-rows-2 gap-0.5">
                    <div className="overflow-hidden">
                        <img
                            src={previews[0].thumbnailUrl}
                            alt={previews[0].name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                    <div className="overflow-hidden">
                        <img
                            src={previews[1].thumbnailUrl}
                            alt={previews[1].name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                </div>
            );
        } else if (previewCount === 1) {
            // Single image
            return (
                <img
                    src={previews[0].thumbnailUrl}
                    alt={previews[0].name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
            );
        } else if (project.coverImage) {
            // Fallback to cover image
            return (
                <img
                    src={project.coverImage}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
            );
        } else {
            // Empty state
            return (
                <div className={`w-full h-full flex items-center justify-center ${isLight ? 'bg-gradient-to-br from-neutral-200 to-neutral-300' : 'bg-gradient-to-br from-neutral-800 to-neutral-700'} group-hover:scale-105 transition-transform duration-700`}>
                    <Camera className={`w-10 h-10 ${isLight ? 'text-neutral-400' : 'text-neutral-600'}`} />
                </div>
            );
        }
    };

    return (
        <Link href={`/g/${project.slug}`} className="group cursor-pointer block">
            {/* Gallery Thumbnail Container - 3/4 aspect ratio */}
            <div className={`aspect-[3/4] rounded-xl mb-4 overflow-hidden ${isLight ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
                {loading ? (
                    // Loading skeleton
                    <div className={`w-full h-full animate-pulse ${isLight ? 'bg-neutral-300' : 'bg-neutral-700'}`} />
                ) : (
                    renderGrid()
                )}
            </div>

            {/* Gallery Info */}
            <h3 className="text-base md:text-lg font-light mb-1">{project.name}</h3>
            <p className={`text-xs md:text-sm ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>Galería pública</p>
        </Link>
    );
}
