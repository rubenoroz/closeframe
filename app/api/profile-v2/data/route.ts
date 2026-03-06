import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { defaultTemplateContent } from "@/types/profile-v2";
import { getInitialProfileData } from "@/lib/profile-v2/templates";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const targetUsername = searchParams.get('username');

        const session = await auth();

        let userEmail = session?.user?.email;
        let whereClause: any = { email: userEmail || "" };

        if (targetUsername) {
            whereClause = { username: targetUsername };
        } else if (!userEmail) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: whereClause,
            select: {
                id: true,
                username: true,
                name: true,
                image: true,
                businessName: true,
                businessLogo: true,
                bio: true
            },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const profile = await prisma.userProfileV2.findUnique({
            where: { userId: user.id },
        });

        if (profile) {
            const content = profile.content as any;
            // Inject username from the User table
            return NextResponse.json({ ...content, username: user.username || content.username || "" });
        }

        // Return dynamic initial content (tutorial/base) with the user's data
        const initialData = getInitialProfileData(user);

        // Ensure we always have the tutorial heading for new users
        return NextResponse.json({
            ...initialData,
            username: user.username || "",
        });
    } catch (error) {
        console.error("Error loading profile v2 data:", error);
        return NextResponse.json({ error: "Error al cargar datos" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, featureOverrides: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const data = await request.json();

        // Sync essential fields to the User table for global branding consistency
        const userUpdateData: any = {};
        if (data.username) userUpdateData.username = data.username;
        if (data.businessName !== undefined) userUpdateData.businessName = data.businessName;

        // [SYNC] Global branding consistency: Logo and Scale
        if (data.header?.logoImage !== undefined) {
            userUpdateData.businessLogo = data.header.logoImage;
        }
        if (data.header?.galleryLogoWidth !== undefined) {
            userUpdateData.businessLogoScale = data.header.galleryLogoWidth;
        } else if (data.header?.logoWidth !== undefined) {
            // Fallback for older profiles or if gallery-specific width isn't set
            userUpdateData.businessLogoScale = data.header.logoWidth;
        }

        // Set profileVersion to v2 in featureOverrides
        const currentOverrides = (user.featureOverrides as any) || {};
        userUpdateData.featureOverrides = {
            ...currentOverrides,
            profileVersion: 'v2'
        };

        if (Object.keys(userUpdateData).length > 0) {
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: userUpdateData,
                });
            } catch (error: any) {
                // Handle unique constraint for username
                if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
                    return NextResponse.json({
                        error: "El username '" + data.username + "' ya está siendo usado por otro perfil. Por favor elige uno diferente."
                    }, { status: 400 });
                }
                throw error;
            }
        }

        await prisma.userProfileV2.upsert({
            where: { userId: user.id },
            update: { content: data },
            create: { userId: user.id, content: data },
        });

        return NextResponse.json({ success: true, message: "Datos guardados correctamente" });
    } catch (error) {
        console.error("Error saving profile v2 data:", error);
        return NextResponse.json({ error: "Error al guardar datos" }, { status: 500 });
    }
}
