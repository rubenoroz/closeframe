
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Plans...");

    // Free Plan
    await prisma.plan.upsert({
        where: { name: "free" },
        update: {
            displayName: "FREE",
            description: "Ideal para empezar",
            price: 0,
            currency: "MXN",
            interval: "month",
            features: JSON.stringify([
                "Perfil público personal",
                "Bio corta",
                "Enlaces externos limitados (Instagram)",
                "3 galerías",
                "Solo imágenes",
                "Hasta 20 imágenes",
                "Galería pública con link",
                "Descargas en baja resolución",
                "Descarga selectiva",
                "Marca de agua simulada",
                "Thumbnails de calidad baja",
                "Modo claro / oscuro",
                "Links públicos",
                "1 nube enlazada",
                "Este plan no incluye video."
            ]),
            limits: JSON.stringify({
                maxProjects: 3,
                maxCloudAccounts: 1,
                hideBranding: false,
                manualOrdering: false,
                videoEnabled: false,
                coverImage: false,
                customFields: false
            }),
            isActive: true,
            sortOrder: 0
        },
        create: {
            name: "free",
            displayName: "FREE",
            description: "Ideal para empezar",
            price: 0,
            currency: "MXN",
            interval: "month",
            features: JSON.stringify([
                "Perfil público personal",
                "Bio corta",
                "Enlaces externos limitados (Instagram)",
                "3 galerías",
                "Solo imágenes",
                "Hasta 20 imágenes",
                "Galería pública con link",
                "Descargas en baja resolución",
                "Descarga selectiva",
                "Marca de agua simulada",
                "Thumbnails de calidad baja",
                "Modo claro / oscuro",
                "Links públicos",
                "1 nube enlazada",
                "Este plan no incluye video."
            ]),
            limits: JSON.stringify({
                maxProjects: 3,
                maxCloudAccounts: 1,
                hideBranding: false,
                manualOrdering: false,
                videoEnabled: false,
                coverImage: false,
                customFields: false
            }), // Limits as JSON string
            isActive: true,
            sortOrder: 0
        }
    });

    // Pro Plan
    await prisma.plan.upsert({
        where: { name: "pro" },
        update: {
            displayName: "PRO",
            description: "Para profesionales activos",
            price: 299,
            currency: "MXN",
            interval: "month",
            features: JSON.stringify([
                "Perfil público profesional",
                "Bio extendida",
                "Campos personalizados (rol, ciudad, pronombres, etc.)",
                "Imagen de portada en perfil y galerías",
                "Ocultar branding de CloserLens",
                "Call to action personalizado",
                "Hasta 100 galerías",
                "Galerías de imágenes",
                "Galerías de video",
                "Galerías públicas, privadas o protegidas por contraseña",
                "Galerías solo visualización",
                "Galerías con descripción editorial",
                "Galerías duplicables (templates)",
                "Orden manual de imágenes y videos",
                "Soporte de video (Nativo desde nube)",
                "Videos alojados en nubes enlazadas",
                "Reproducción integrada dentro de galerías",
                "Ideal para clips, reels cortos, piezas individuales.",
                "Descargas en alta resolución",
                "Marca de agua personalizada simulada",
                "Thumbnails de calidad media",
                "Tipografías personalizadas",
                "Transiciones suaves",
                "Links públicos y privados",
                "2 nubes enlazadas",
                "Soporte estándar",
                "Integración con pagos de stripe"
            ]),
            limits: JSON.stringify({
                maxProjects: 100,
                maxCloudAccounts: 2,
                hideBranding: true,
                manualOrdering: true,
                videoEnabled: true,
                coverImage: true,
                customFields: true,
                zipDownloadsEnabled: true
            }),
            isActive: true,
            sortOrder: 1
        },
        create: {
            name: "pro",
            displayName: "PRO",
            description: "Para profesionales activos",
            price: 299,
            currency: "MXN",
            interval: "month",
            features: JSON.stringify([
                "Perfil público profesional",
                "Bio extendida",
                "Campos personalizados (rol, ciudad, pronombres, etc.)",
                "Imagen de portada en perfil y galerías",
                "Ocultar branding de CloserLens",
                "Call to action personalizado",
                "Hasta 100 galerías",
                "Galerías de imágenes",
                "Galerías de video",
                "Galerías públicas, privadas o protegidas por contraseña",
                "Galerías solo visualización",
                "Galerías con descripción editorial",
                "Galerías duplicables (templates)",
                "Orden manual de imágenes y videos",
                "Soporte de video (Nativo desde nube)",
                "Videos alojados en nubes enlazadas",
                "Reproducción integrada dentro de galerías",
                "Ideal para clips, reels cortos, piezas individuales.",
                "Descargas en alta resolución",
                "Marca de agua personalizada simulada",
                "Thumbnails de calidad media",
                "Tipografías personalizadas",
                "Transiciones suaves",
                "Links públicos y privados",
                "2 nubes enlazadas",
                "Soporte estándar",
                "Integración con pagos de stripe"
            ]),
            limits: JSON.stringify({
                maxProjects: 100,
                maxCloudAccounts: 2,
                hideBranding: true,
                manualOrdering: true,
                videoEnabled: true,
                coverImage: true,
                customFields: true,
                zipDownloadsEnabled: true
            }),
            isActive: true,
            sortOrder: 1
        }
    });

    console.log("Plans seeded successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
