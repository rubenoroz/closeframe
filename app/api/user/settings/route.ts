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
                coverImage: true,

                callToAction: true,
                bookingWindow: true,
                bookingLeadTime: true,
                // Perfil expandido
                profileType: true,
                headline: true,
                location: true,
                socialLinks: true,
                username: true,
                profileViews: true,
                // Plan y suscripción
                planId: true,
                planExpiresAt: true,
                featureOverrides: true, // Allow client to see exceptions
                plan: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        currency: true,
                        interval: true,
                        // features: true, // Legacy
                        // limits: true, // Legacy
                        config: true // New Modular Config
                    }
                },
                // Cuentas de nube conectadas
                cloudAccounts: {
                    select: {
                        id: true,
                        provider: true,
                        email: true,
                        name: true,
                        createdAt: true
                    }
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                        public: true,
                        showInProfile: true,
                        coverImage: true,
                        cloudAccountId: true,
                        createdAt: true,
                        profileOrder: true
                    },
                    orderBy: [
                        { profileOrder: 'asc' },
                        { createdAt: 'desc' }
                    ]
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Calculate Effective Config server-side
        // Note: Client can now use the /api/features/me endpoint for detailed matrix
        // but we can still return a summary here for convenience if needed.

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

import { getFeatureLimit } from "@/lib/features/service";

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const userId = session.user.id;

        // Enforce Bio Limit via DB Matrix
        const bioMaxLength = await getFeatureLimit(userId, 'bioMaxLength') || 150;
        if (body.bio && body.bio.length > bioMaxLength) {
            body.bio = body.bio.slice(0, bioMaxLength);
        }

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
            businessLogoScale,
            coverImage,
            coverImageFocus,

            callToAction,
            bookingWindow,
            bookingLeadTime,

            // Perfil expandido
            profileType,
            headline,
            location,
            socialLinks,
            username: rawUsername
        } = body;

        // Normalizar username: vacío => null
        const username = rawUsername && rawUsername.trim() !== '' ? rawUsername.trim() : null;

        // Validar que el username no esté en uso por otro usuario
        if (username) {
            console.log("Validando username:", username, "para usuario:", session.user.id);

            const existingUser = await prisma.user.findFirst({
                where: {
                    username: username,
                    NOT: { id: session.user.id }
                },
                select: { id: true }
            });

            console.log("Usuario existente con ese username:", existingUser);

            if (existingUser) {
                return NextResponse.json({
                    error: "Este nombre de usuario ya está en uso",
                    field: "username"
                }, { status: 409 });
            }
        }

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
                coverImage,
                coverImageFocus,

                callToAction,
                bookingWindow: bookingWindow !== undefined ? Number(bookingWindow) : 4,
                bookingLeadTime: bookingLeadTime !== undefined ? Number(bookingLeadTime) : 1,

                // Perfil expandido
                profileType,
                headline,
                location,
                socialLinks,
                username,
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
                coverImage,
                coverImageFocus,

                callToAction,
                bookingWindow: bookingWindow !== undefined ? Number(bookingWindow) : 4,
                bookingLeadTime: bookingLeadTime !== undefined ? Number(bookingLeadTime) : 1,

                // Perfil expandido
                profileType,
                headline,
                location,
                socialLinks,
                username,
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
