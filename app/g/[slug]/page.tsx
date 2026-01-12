import React from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicGalleryClient from "@/components/gallery/PublicGalleryClient";

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
                    businessLogoScale: true
                }
            }
        },
        // Include all fields (Prisma will automatically include new schema fields)
    });

    if (!project) {
        return notFound();
    }

    return (
        <PublicGalleryClient project={project} />
    );
}
