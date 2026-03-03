import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No se encontró ningún archivo." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create a unique filename with safe characters
        const ext = file.name.split('.').pop();
        const base = file.name.replace(/\.[^/.]+$/, "");
        const safeName = base
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-zA-Z0-9]/g, "-")   // Replace non-alphanumeric with hyphen
            .replace(/-+/g, "-")            // Remove duplicate hyphens
            .toLowerCase();

        const filename = `${Date.now()}-${safeName}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "profile-v2");

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Return the public URL
        const url = `/uploads/profile-v2/${filename}`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error("Error in profile-v2 upload:", error);
        return NextResponse.json({ error: "Error al procesar la subida." }, { status: 500 });
    }
}
