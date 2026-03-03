import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { defaultTemplateContent } from "@/types/profile-v2";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, username: true },
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

        // Return default content with the user's username
        return NextResponse.json({ ...defaultTemplateContent, username: user.username || "" });
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
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const data = await request.json();

        // If username is being updated, also update the User table
        if (data.username) {
            await prisma.user.update({
                where: { id: user.id },
                data: { username: data.username },
            });
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
