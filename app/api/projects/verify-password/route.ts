import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { slug, password } = body;

        if (!slug || !password) {
            return NextResponse.json({ error: "Slug and password are required" }, { status: 400 });
        }

        const project = await prisma.project.findUnique({
            where: { slug },
            select: { passwordHash: true, passwordProtected: true }
        });

        if (!project) {
            return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
        }

        if (!project.passwordProtected) {
            return NextResponse.json({ success: true, message: "No password needed" });
        }

        const isValid = await bcrypt.compare(password, project.passwordHash || "");

        if (!isValid) {
            return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Verify Password Error:", error);
        return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
    }
}
