import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { google } from "googleapis";
import { getFreshGoogleAuth } from "@/lib/cloud/google-auth";

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
                const auth = await getFreshGoogleAuth(project.cloudAccount.id);
                const drive = google.drive({ version: "v3", auth });

                const res = await drive.files.list({
                    q: `'${project.rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: "files(name)",
                });

                const folders = res.data.files || [];
                const names = folders.map((f: any) => f.name?.toLowerCase());

                return {
                    ...project,
                    health: {
                        web: names.includes("webjpg"),
                        jpg: names.includes("jpg"),
                        raw: names.includes("raw"),
                    }
                };
            } catch (err) {
                return { ...project, health: null };
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
            downloadEnabled,
            downloadJpgEnabled,
            downloadRawEnabled,
            headerTitle,
            headerFontFamily,
            headerColor,
            headerBackground,
            enableVideoTab,
            videoFolderId,
            downloadVideoHdEnabled,
            downloadVideoRawEnabled,
        } = body;

        if (!name || !cloudAccountId || !rootFolderId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

        const project = await prisma.project.create({
            data: {
                name,
                slug,
                cloudAccountId,
                rootFolderId,
                userId: session.user.id,
                layoutType: "grid",
                passwordProtected,
                passwordHash,
                downloadEnabled: downloadEnabled ?? true,
                downloadJpgEnabled: downloadJpgEnabled ?? true,
                downloadRawEnabled: downloadRawEnabled ?? false,
                // Header customization
                headerTitle: headerTitle || name, // Fallback to project name
                headerFontFamily: headerFontFamily || "Inter",
                headerColor: headerColor || "#FFFFFF",
                headerBackground: headerBackground || "dark",
                // Video tab
                enableVideoTab: enableVideoTab || false,
                videoFolderId: enableVideoTab ? videoFolderId : null,
                downloadVideoHdEnabled: downloadVideoHdEnabled ?? true,
                downloadVideoRawEnabled: downloadVideoRawEnabled ?? false,
            },
        });

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
        const { id, name, password, downloadEnabled, downloadJpgEnabled, downloadRawEnabled, layoutType, public: isPublic } = body;

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
        if (layoutType !== undefined) updateData.layoutType = layoutType;

        // Handle public status based on password
        if (password !== undefined && password.trim() !== "") {
            updateData.public = false; // If password is set, project must be private
        } else if (isPublic !== undefined) {
            updateData.public = isPublic; // Otherwise, use the provided public status
        }

        if (password !== undefined) {
            if (password === "") {
                updateData.passwordProtected = false;
                updateData.passwordHash = null;
            } else {
                updateData.passwordProtected = true;
                updateData.passwordHash = await bcrypt.hash(password, 10);
            }
        }

        const updatedProject = await prisma.project.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ project: updatedProject });
    } catch (error) {
        console.error("UPDATE Project Error:", error);
        return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
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
