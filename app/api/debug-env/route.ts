
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/security/encryption";

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV !== "development") {
        return new NextResponse(null, { status: 404 });
    }

    const checks: any = {
        env: {
            DATA_ENCRYPTION_KEY: !!process.env.DATA_ENCRYPTION_KEY,
            NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
            AUTH_SECRET: !!process.env.AUTH_SECRET,
            GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        },
        database: "pending",
        encryption: "pending"
    };

    try {
        // Test Encryption
        try {
            const original = "test-string";
            const encrypted = encrypt(original);
            const decrypted = decrypt(encrypted);
            checks.encryption = {
                works: decrypted === original,
                encryptedSample: encrypted ? "generated" : "failed"
            };
        } catch (e: any) {
            checks.encryption = { error: e.message };
        }

        // Test Database
        try {
            const count = await prisma.user.count();
            checks.database = { status: "connected", userCount: count };
        } catch (e: any) {
            checks.database = { error: e.message };
        }

        return NextResponse.json(checks);
    } catch (error: any) {
        return NextResponse.json({
            error: "Unexpected Error",
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
