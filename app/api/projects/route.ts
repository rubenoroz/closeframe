import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { google } from "googleapis";
import { getFreshAuth } from "@/lib/cloud/auth-factory";
import { canUseFeature, getFeatureAccess, getEffectiveFeatures } from "@/lib/features/service"; // [SECURE]

// GET: List all projects for the current user
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projects = await prisma.project.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: "desc" },
            include: {
                cloudAccount: true,
            },
        });

        // Enhance projects with folder health info
        const enhancedProjects = await Promise.all(projects.map(async (project: any) => {
            try {
                // Use centralized auth utility to get a fresh client
                // This now supports Google, Microsoft, Dropbox via getFreshAuth
                const authClient = await getFreshAuth(project.cloudAccount.id);

                // Initialize health object
                let health = {
                    web: false,
                    jpg: false,
                    raw: false,
                    cloudDisconnected: false
                };

                // Logic for Google Drive health (existing)
                if (project.cloudAccount.provider === "google") {
                    const drive = google.drive({ version: "v3", auth: authClient as any });

                    // First, check root folder for subfolders
                    const res = await drive.files.list({
                        q: `'${project.rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                        fields: "files(id, name)",
                    });

                    const folders = res.data.files || [];
                    let names = folders.map((f: any) => f.name?.toLowerCase());

                    // Check if there's a "Fotografias" subfolder - if so, look inside it
                    const fotografiasFolder = folders.find((f: any) => f.name?.toLowerCase() === "fotografias");
                    if (fotografiasFolder) {
                        const subRes = await drive.files.list({
                            q: `'${fotografiasFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                            fields: "files(name)",
                        });
                        const subFolders = subRes.data.files || [];
                        names = subFolders.map((f: any) => f.name?.toLowerCase());
                    }

                    health.web = names.includes("webjpg");
                    health.jpg = names.includes("jpg");
                    health.raw = names.includes("raw");
                } else if (project.cloudAccount.provider === "microsoft") {
                    // Microsoft Ping Health check
                    try {
                        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${project.rootFolderId}`;
                        const res = await fetch(url, { headers: { Authorization: `Bearer ${authClient}` } });
                        if (res.ok) {
                            health.web = true; health.jpg = true; health.raw = true;
                        }
                    } catch (e) { health.cloudDisconnected = true; }
                } else if (project.cloudAccount.provider === "dropbox") {
                    // Dropbox Ping Health
                    try {
                        const res = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${authClient}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ path: project.rootFolderId })
                        });
                        if (res.ok) {
                            health.web = true; health.jpg = true; health.raw = true;
                        }
                    } catch (e) { health.cloudDisconnected = true; }
                } else {
                    health.web = true; health.jpg = true; health.raw = true;
                }

                return { ...project, health };
            } catch (err: any) {
                console.error(`[API] Health check failed for project ${project.id}:`, err.message);

                // Detect if it's an authentication error
                const isAuthError = err.status === 401 ||
                    err.code === 401 ||
                    err.message?.includes("invalid_grant") ||
                    err.message?.includes("invalid_request") ||
                    err.message?.toLowerCase().includes("unauthorized") ||
                    err.message?.toLowerCase().includes("expired");

                return {
                    ...project,
                    health: {
                        web: false,
                        jpg: false,
                        raw: false,
                        cloudDisconnected: isAuthError
                    }
                };
            }
        }));

        return NextResponse.json({ projects: enhancedProjects });
    } catch (error) {
        console.error("GET Projects Error:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

// POST: Create a new project
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            name,
            cloudAccountId,
            rootFolderId,
            password,
            category, // [NEW]
            date, // [NEW]
            downloadEnabled,
            downloadJpgEnabled,
            downloadRawEnabled,
            headerTitle,
            headerFontFamily,
            headerFontSize, // [NEW]
            headerColor,
            headerBackground,
            headerImage, // [NEW]
            headerImageFocus, // [NEW]
            coverImage, // [NEW]
            coverImageFocus, // [NEW]
            enableVideoTab,
            videoFolderId,
            downloadVideoHdEnabled,
            downloadVideoRawEnabled,
            layoutType, // [NEW]
            zipFileId, // [NEW]
            zipFileName, // [NEW]
            isCloserGallery,
            isCollaborative,
            moments,
            musicTrackId, // [NEW]
            musicEnabled // [NEW]
        } = body;

        if (!name || !cloudAccountId || !rootFolderId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get user with plan limits
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                plan: true,
                _count: { select: { projects: true } }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Validate max projects limit
        const planLimits = user.plan?.limits ? JSON.parse(user.plan.limits) : null;
        const maxProjects = planLimits?.maxProjects ?? 3; // Default: 3 if no plan

        if (user._count.projects >= maxProjects) {
            return NextResponse.json({
                error: `Has alcanzado el límite de ${maxProjects} galería(s) de tu plan. Actualiza tu plan para crear más.`,
                code: "PLAN_LIMIT_REACHED"
            }, { status: 403 });
        }

        // Verify Cloud Account belongs to user
        const account = await prisma.cloudAccount.findFirst({
            where: { id: cloudAccountId, userId: session.user.id },
        });

        if (!account) {
            return NextResponse.json({ error: "Invalid cloud account" }, { status: 403 });
        }

        // Create unique slug
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + nanoid(6);

        // Hash password if provided
        let passwordHash = null;
        let passwordProtected = false;
        if (password && password.trim() !== "") {
            passwordHash = await bcrypt.hash(password, 10);
            passwordProtected = true;
        }



        if (isCollaborative) {
            const allowed = await canUseFeature(session.user.id, 'collaborativeGalleries');
            if (!allowed) {
                return NextResponse.json({
                    error: "Your plan does not support Collaborative Galleries. Please upgrade.",
                    code: "PLAN_LIMIT_REACHED"
                }, { status: 403 });
            }
        }

        if (zipFileId) {
            const allowed = await canUseFeature(session.user.id, 'zipDownloadsEnabled');
            if (!allowed) {
                return NextResponse.json({
                    error: "Your plan does not support Zip Downloads. Please upgrade.",
                    code: "PLAN_LIMIT_REACHED"
                }, { status: 403 });
            }
        }

        const project = await prisma.project.create({
            data: {
                name,
                slug,
                category: category || null,
                date: date ? new Date(date) : null,
                cloudAccountId,
                rootFolderId,
                userId: session.user.id,
                layoutType: layoutType || "grid",
                passwordProtected,
                passwordHash,
                downloadEnabled: downloadEnabled ?? true,
                downloadJpgEnabled: downloadJpgEnabled ?? true,
                downloadRawEnabled: downloadRawEnabled ?? false,
                // Header customization
                headerTitle: headerTitle || name, // Fallback to project name
                headerFontFamily: headerFontFamily || "Inter",
                headerFontSize: headerFontSize || 100,
                headerColor: headerColor || "#FFFFFF",
                headerBackground: headerBackground || "dark",
                headerImage: headerImage || null,
                headerImageFocus: headerImageFocus || "50,50",
                coverImage: coverImage || null,
                coverImageFocus: coverImageFocus || "50,50",
                // Video tab
                enableVideoTab: enableVideoTab ?? false,
                videoFolderId: enableVideoTab ? videoFolderId : null,
                downloadVideoHdEnabled: downloadVideoHdEnabled ?? true,
                downloadVideoRawEnabled: downloadVideoRawEnabled ?? false,
                isCloserGallery: true,
                isCollaborative: isCollaborative ?? false, // Save collaborative status
                // Zip file
                zipFileId: zipFileId || null,
                zipFileName: zipFileName || null,
                // Music
                musicTrackId: musicTrackId || null,
                musicEnabled: musicEnabled ?? false, // [FIX] Save music enabled state
            },
        });

        // Create "Moment" folders in cloud if requested
        if (moments && Array.isArray(moments) && moments.length > 0) {
            try {
                const account = await prisma.cloudAccount.findUnique({ where: { id: cloudAccountId } });
                const auth = await getFreshAuth(cloudAccountId);

                if (account?.provider === "google") {
                    const drive = google.drive({ version: "v3", auth: auth as any });
                    await Promise.all(moments.map(async (m: string) => {
                        if (!m) return;
                        try {
                            await drive.files.create({
                                requestBody: { name: m.trim(), mimeType: "application/vnd.google-apps.folder", parents: [rootFolderId] }
                            });
                        } catch (e) { console.error("Moment creation error (Google):", e); }
                    }));
                } else if (account?.provider === "microsoft") {
                    await Promise.all(moments.map(async (m: string) => {
                        if (!m) return;
                        try {
                            const url = `https://graph.microsoft.com/v1.0/me/drive/items/${rootFolderId}/children`;
                            await fetch(url, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: m.trim(), folder: {}, "@microsoft.graph.conflictBehavior": "rename" })
                            });
                        } catch (e) { console.error("Moment creation error (Microsoft):", e); }
                    }));
                } else if (account?.provider === "dropbox") {
                    await Promise.all(moments.map(async (m: string) => {
                        if (!m) return;
                        try {
                            await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path: `${rootFolderId}/${m.trim()}`, autorename: true })
                            });
                        } catch (e) { console.error("Moment creation error (Dropbox):", e); }
                    }));
                }
            } catch (err) {
                console.error("Failed to process moments creation", err);
            }
        }

        return NextResponse.json({ project });
    } catch (error) {
        console.error("CREATE Project Error:", error);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}

// PATCH: Update project settings
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            id, name, password, category, date,
            downloadEnabled, downloadJpgEnabled, downloadRawEnabled,
            downloadVideoHdEnabled, downloadVideoRawEnabled,
            enableVideoTab, showInProfile, enableWatermark,
            headerTitle, headerFontFamily, headerFontSize, headerColor, headerBackground, headerImage, headerImageFocus,
            coverImage, coverImageFocus,
            zipFileId, zipFileName,
            layoutType, public: isPublic,
            isCloserGallery, musicTrackId, musicEnabled, isCollaborative, likesEnabled // [NEW]
        } = body;

        console.log("[API] PATCH Project Payload:", { id, name, category, date, isCloserGallery }); // [DEBUG]

        if (!id) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        // Verify project belongs to user
        const existingProject = await prisma.project.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existingProject) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (downloadEnabled !== undefined) updateData.downloadEnabled = downloadEnabled;

        if (downloadJpgEnabled !== undefined) updateData.downloadJpgEnabled = downloadJpgEnabled;
        if (downloadRawEnabled !== undefined) updateData.downloadRawEnabled = downloadRawEnabled;

        // Video and other fields...
        if (enableVideoTab !== undefined) updateData.enableVideoTab = enableVideoTab;

        // Professional features enabled by default
        updateData.isCloserGallery = true;

        // Enforce Collaborative Gallery restriction
        if (isCollaborative !== undefined) {
            if (isCollaborative === true) {
                const allowed = await canUseFeature(session.user.id, 'collaborativeGalleries');
                if (!allowed) {
                    return NextResponse.json({ error: "Your plan does not support Collaborative Galleries" }, { status: 403 });
                }
            }
            updateData.isCollaborative = isCollaborative;
        }

        // Pass through video download settings (could be stricter here too)
        if (downloadVideoHdEnabled !== undefined) updateData.downloadVideoHdEnabled = downloadVideoHdEnabled;
        if (downloadVideoRawEnabled !== undefined) updateData.downloadVideoRawEnabled = downloadVideoRawEnabled;

        if (showInProfile !== undefined) updateData.showInProfile = showInProfile;
        if (enableWatermark !== undefined) updateData.enableWatermark = enableWatermark;
        if (category !== undefined) updateData.category = category;
        if (date !== undefined) updateData.date = date ? new Date(date) : null;
        if (headerTitle !== undefined) {
            // If user clears the input (sends ""), we set it to null so it falls back to name
            updateData.headerTitle = headerTitle === "" ? null : headerTitle;
        }
        if (headerFontFamily !== undefined) updateData.headerFontFamily = headerFontFamily;
        if (headerFontSize !== undefined) updateData.headerFontSize = headerFontSize;
        if (headerColor !== undefined) updateData.headerColor = headerColor;
        if (headerBackground !== undefined) updateData.headerBackground = headerBackground;
        if (headerImage !== undefined) updateData.headerImage = headerImage;
        if (headerImageFocus !== undefined) updateData.headerImageFocus = headerImageFocus;
        if (coverImage !== undefined) updateData.coverImage = coverImage;
        if (coverImageFocus !== undefined) updateData.coverImageFocus = coverImageFocus;
        if (zipFileId !== undefined) updateData.zipFileId = zipFileId || null;
        if (zipFileName !== undefined) updateData.zipFileName = zipFileName || null;
        if (layoutType !== undefined) updateData.layoutType = layoutType;
        if (musicTrackId !== undefined) updateData.musicTrackId = musicTrackId;
        if (musicEnabled !== undefined) updateData.musicEnabled = musicEnabled; // [NEW]
        if (likesEnabled !== undefined) updateData.likesEnabled = likesEnabled; // [NEW]

        // Handle public status based on password
        if (typeof password === 'string' && password.trim() !== "") {
            updateData.public = false; // If password is set, project must be private
        } else if (password === null) {
            // If password is removed, we force public=true.
            // The frontend sends the previous 'public' state (which might be false), 
            // but removing the password in this UI context implies making it public.
            updateData.public = true;
        } else if (isPublic !== undefined) {
            updateData.public = isPublic;
        }

        // [SECURE] Enforce Zip Downloads
        if (zipFileId !== undefined && zipFileId !== null && zipFileId !== "") {
            const allowed = await canUseFeature(session.user.id, 'zipDownloadsEnabled');
            if (!allowed) {
                return NextResponse.json({
                    error: "Your plan does not support Zip Downloads.",
                    code: "PLAN_LIMIT_REACHED"
                }, { status: 403 });
            }
        }

        // Handle Password Update
        if (password === null) {
            // Explicitly remove password
            updateData.passwordProtected = false;
            updateData.passwordHash = null;
        } else if (typeof password === 'string') {
            if (password.trim() !== "") {
                // Set new password
                updateData.passwordProtected = true;
                updateData.passwordHash = await bcrypt.hash(password, 10);
            }
            // If password is "" (empty string), we DO NOTHING. 
            // This preserves the existing password/hash in the database.
        }

        const updatedProject = await prisma.project.update({
            where: { id },
            data: updateData,
        });

        console.log("[API] Project Updated Successfully:", updatedProject.id); // [DEBUG]

        return NextResponse.json({ project: updatedProject });
    } catch (error: any) {
        console.error("UPDATE Project Error Stack:", error, error.stack); // [DEBUG]
        return NextResponse.json({ error: "Failed to update project", details: error.message }, { status: 500 });
    }
}

// DELETE: Remove a project
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        // Verify project belongs to user
        const project = await prisma.project.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        await prisma.project.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE Project Error:", error);
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}
