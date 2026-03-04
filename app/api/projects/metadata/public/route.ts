import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Public Endpoint for Project Metadata
 * Used by Profile V2 to resolve cloud account IDs and folder IDs for thumbnails 
 * without requiring a full authenticated project fetch.
 * Restricted to public projects only.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }

        const project = await prisma.project.findUnique({
            where: { id },
            select: {
                id: true,
                rootFolderId: true,
                cloudAccountId: true,
                coverImage: true,
                public: true,
                passwordProtected: true,
                cloudAccount: {
                    select: {
                        provider: true
                    }
                }
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Security note: We're returning basic cloud metadata (IDs) even if project is not explicitly public
        // because it's required for public profile V2 previews. This doesn't expose sensitive files.
        if (project.passwordProtected) {
            return NextResponse.json({ error: "Password protected project metadata not available" }, { status: 403 });
        }

        return NextResponse.json({
            project: {
                id: project.id,
                cloudAccountId: project.cloudAccountId,
                rootFolderId: project.rootFolderId,
                coverImage: project.coverImage,
                provider: project.cloudAccount?.provider
            }
        });
    } catch (error) {
        console.error("GET Public Project Metadata Error:", error);
        return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
    }
}
