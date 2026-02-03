import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth"; // path to auth.ts in root
import { KoofrProvider } from "@/lib/cloud/koofr-provider";
import { encrypt } from "@/lib/security/encryption";

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
        // SECURITY: Encrypt passwords (AES-256)


        // Check if exists
        const existing = await prisma.cloudAccount.findFirst({
            where: {
                userId: session.user.id,
                provider: "koofr",
                email: email
            }
        });

        const encryptedPassword = encrypt(password);

        if (existing) {
            // Update
            // Verify ownership implicitly via the findFirst above (userId check), 
            // but just to be explicit and safe:
            if (existing.userId !== session.user.id) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }

            await prisma.cloudAccount.update({
                where: { id: existing.id },
                data: {
                    accessToken: encryptedPassword, // Store Encrypted
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
                    accessToken: encryptedPassword, // Store Encrypted
                    refreshToken: "basic", // Marker
                    expiresAt: null // Never expires (until revoked)
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Koofr Connect Error Details:", error);
        return NextResponse.json({
            error: error.message || "Internal Server Error",
            details: error.stack
        }, { status: 500 });
    }
}
