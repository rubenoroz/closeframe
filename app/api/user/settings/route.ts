import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                businessName: true,
                businessLogo: true,
                businessWebsite: true,
                businessInstagram: true,
                businessPhone: true,
                bio: true,
                specialty: true,
                theme: true,
                businessLogoScale: true,
                projects: {
                    select: {
                        id: true,
                        name: true,
                        public: true,
                        showInProfile: true,
                        coverImage: true,
                        createdAt: true
                    }
                }
            }
        });

        return new NextResponse(JSON.stringify({ user }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
            },
        });
    } catch (error) {
        console.error("GET Settings Error:", error);
        return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log("PATCH Settings Body:", JSON.stringify(body, null, 2));

        const {
            name,
            businessName,
            businessLogo,
            businessWebsite,
            businessInstagram,
            businessPhone,
            bio,
            specialty,
            theme,
            businessLogoScale
        } = body;

        const updatedUser = await prisma.user.upsert({
            where: { id: session.user.id },
            update: {
                name,
                businessName,
                businessLogo,
                businessWebsite,
                businessInstagram,
                businessPhone,
                bio,
                specialty,
                theme: theme || "dark",
                businessLogoScale: businessLogoScale !== undefined ? Number(businessLogoScale) : 100,
            },
            create: {
                id: session.user.id,
                email: session.user.email!,
                name: name || session.user.name,
                businessName,
                businessLogo,
                businessWebsite,
                businessInstagram,
                businessPhone,
                bio,
                specialty,
                theme: theme || "dark",
                businessLogoScale: businessLogoScale !== undefined ? Number(businessLogoScale) : 100,
            }
        });

        return new NextResponse(JSON.stringify({ user: updatedUser }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
            },
        });
    } catch (error: any) {
        console.error("PATCH Settings Error Details:", error);
        return NextResponse.json({
            error: "Error al actualizar perfil",
            details: error?.message || "Internal error"
        }, { status: 500 });
    }
}
