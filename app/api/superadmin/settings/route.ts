
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/superadmin";

// Helper to check admin role
async function checkAdmin() {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN" && session?.user?.role !== "STAFF") {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function GET() {
    try {
        await checkAdmin();

        // Fetch all settings
        const settingsList = await prisma.systemSettings.findMany();

        // Convert array to object
        const settings: Record<string, any> = {};
        settingsList.forEach(s => {
            // Try to parse JSON values, otherwise keep string
            try {
                settings[s.key] = JSON.parse(s.value);
            } catch {
                settings[s.key] = s.value;
            }
        });

        // Merge with defaults if missing
        return NextResponse.json(settings);
    } catch (error) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await checkAdmin();
        const body = await req.json(); // keys and values

        // Loop through keys and update upsert
        for (const [key, value] of Object.entries(body)) {
            await prisma.systemSettings.upsert({
                where: { key },
                update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
                create: {
                    key,
                    value: typeof value === 'string' ? value : JSON.stringify(value)
                }
            });
        }

        // Audit log
        await logAdminAction({
            adminId: session.user?.id || "unknown",
            adminEmail: session.user?.email,
            adminRole: session.user?.role,
            action: "SYSTEM_SETTINGS_UPDATE",
            resourceType: "SystemSettings",
            resourceId: "global",
            details: body
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update settings", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
