import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth"; // path to auth.ts in root
import { KoofrProvider } from "@/lib/cloud/koofr-provider";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { email, password, name } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email y Contraseña requeridos" }, { status: 400 });
        }

        // 1. Verify credentials by listing mounts
        const provider = new KoofrProvider(email, password);
        const mounts = await provider.listFolders(); // Try to list root folders as verification

        // If listFolders returns empty array it might still be valid, but if it throws or fails logic...
        // Let's rely on provider logic. listFolders returns [] on error/empty.
        // A better check might be getQuota or similar.
        const quota = await provider.getQuota();

        if (!quota) {
            return NextResponse.json({ error: "Credenciales inválidas o error de conexión con Koofr" }, { status: 401 });
        }

        // 2. Save to DB
        // We store the App Password in accessToken (encrypted storage recommended in prod, assuming DB safe for now)
        // refresh_token isn't used for Basic Auth, but we can store 'basic' to indicate type

        // Check if exists
        const existing = await prisma.cloudAccount.findFirst({
            where: {
                userId: session.user.id,
                provider: "koofr",
                email: email
            }
        });

        if (existing) {
            // Update
            await prisma.cloudAccount.update({
                where: { id: existing.id },
                data: {
                    accessToken: password, // Update password
                    name: name || existing.name || "Koofr",
                    updatedAt: new Date()
                }
            });
        } else {
            // Create
            await prisma.cloudAccount.create({
                data: {
                    userId: session.user.id!,
                    provider: "koofr",
                    providerId: email, // Use email as provider ID for Koofr
                    email: email,
                    name: name || "Koofr",
                    accessToken: password,
                    refreshToken: "basic", // Marker
                    expiresAt: null // Never expires (until revoked)
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Koofr Connect Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
