import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { nanoid } from "nanoid";
import { getFreshGoogleAuth } from "@/lib/cloud/google-auth";
import { google } from "googleapis";
import { getEffectiveFeatures } from "@/lib/features/service";

// POST /api/projects/[projectId]/duplicate
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { newName, newRootFolderId } = body;

        if (!newName || !newRootFolderId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch Source Project
        const sourceProject = await prisma.project.findUnique({
            where: { id: id, userId: session.user.id }
        });

        if (!sourceProject) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // 2. Check Limits (Max Projects)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { plan: true, _count: { select: { projects: true } } }
        });

        const planLimits = user?.plan?.limits ? JSON.parse(user.plan.limits) : null;
        const maxProjects = planLimits?.maxProjects ?? 3;

        if (user?._count.projects! >= maxProjects) {
            return NextResponse.json({
                error: `Limit reached (${maxProjects})`,
                code: "PLAN_LIMIT_REACHED"
            }, { status: 403 });
        }

        // 3. Prepare New Project Data
        // Clone everything except ID, unique fields, and specific folder connections
        const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + nanoid(6);

        // [SECURE] double check features for the new project in case plan changed
        const features = await getEffectiveFeatures(session.user.id);

        // Sanitize restricted features just in case source had them enabled but now plan forbids
        const downloadJpgEnabled = (features.lowResDownloads !== false) ? sourceProject.downloadJpgEnabled : false;
        const downloadRawEnabled = (features.highResDownloads !== false) ? sourceProject.downloadRawEnabled : false;
        const enableVideoTab = (features.videoEnabled !== false) ? sourceProject.enableVideoTab : false;

        // 4. Create New Project
        const newProject = await prisma.project.create({
            data: {
                // Identity
                name: newName,
                slug: slug,
                userId: session.user.id,
                cloudAccountId: sourceProject.cloudAccountId, // Same cloud account
                rootFolderId: newRootFolderId, // NEW Folder

                // Settings (Cloned)
                category: sourceProject.category,
                layoutType: sourceProject.layoutType,
                passwordProtected: sourceProject.passwordProtected,
                passwordHash: sourceProject.passwordHash, // Keep same password

                // Downloads & Permissions
                downloadEnabled: sourceProject.downloadEnabled,
                downloadJpgEnabled,
                downloadRawEnabled,

                // Header Design
                headerTitle: newName, // Reset title to match name? Or keep source headerTitle? usually match name defaults
                headerFontFamily: sourceProject.headerFontFamily,
                headerFontSize: sourceProject.headerFontSize,
                headerColor: sourceProject.headerColor,
                headerBackground: sourceProject.headerBackground,
                headerImage: null, // Reset as per user request
                // If it's a file ID, it might still work if the user has access, 
                // but likely better to reset or copy if possible. 
                // Usually users want to keep the design. 
                // But if headerImage is a File ID inside the old root folder, 
                // and we switch root, it might be weird. however, Drive IDs are global.
                // Let's keep it.
                headerImageFocus: sourceProject.headerImageFocus,

                // Cover
                coverImage: null, // Reset as per user request
                coverImageFocus: sourceProject.coverImageFocus,

                // Video
                enableVideoTab,
                videoFolderId: null, // Reset video folder as it's folder-specific
                downloadVideoHdEnabled: sourceProject.downloadVideoHdEnabled,
                downloadVideoRawEnabled: sourceProject.downloadVideoRawEnabled,

                // Closer Premium
                isCloserGallery: sourceProject.isCloserGallery,
                isCollaborative: sourceProject.isCollaborative,
                musicTrackId: sourceProject.musicTrackId,
                musicEnabled: sourceProject.musicEnabled,

                // Zip (Reset)
                zipFileId: null,
                zipFileName: null,
            }
        });

        // 5. If Closer Gallery, create Moments structure in the NEW folder?
        // User said: "duplicar... escoger un nuevo folder... asi si estaría funcional"
        // If the user picks a new folder, they might expect the SUBFOLDERS (Moments) to be created there too?
        // The Prompt implies "Templates". So yes, we should probably re-create the "Moments" folders if they don't exist.
        // But `moments` list is not stored in DB as a list, currently passed in CREATE body only.
        // We don't have a `moments` field in Project model (it was just in the POST body).
        // Since we can't easily know the "Moments" list from the DB project record (unless we scan the old folder),
        // we will SKIP creating moments automatically for now. The user can add them in settings.

        return NextResponse.json({ project: newProject });

    } catch (error) {
        console.error("Duplicate Project Error:", error);
        return NextResponse.json({ error: "Failed to duplicate project" }, { status: 500 });
    }
}
