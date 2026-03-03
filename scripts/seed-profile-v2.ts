import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // Busca un usuario para probar
    const username = "onirica"; // Cambiar por el usuario que quieras probar
    const user = await prisma.user.findUnique({
        where: { username }
    });

    if (!user) {
        console.error("User not found");
        return;
    }

    const sampleContent = {
        "header": {
            "logoText": "",
            "navigation": [
                { "label": "Inicio", "url": "#home" },
                { "label": "Acerca de", "url": "#about" },
                { "label": "Experiencia", "url": "#experience", "visible": true },
                { "label": "Proyectos", "url": "#projects" },
                { "label": "Testimonios", "url": "#testimonials" }
            ],
            "socials": [
                { "icon": "fas fa-globe", "url": "#" },
                { "icon": "fab fa-youtube", "url": "#" },
                { "icon": "fab fa-instagram", "url": "#" }
            ],
            "logoImage": "/uploads/1772388276071-onírica.svg",
            "logoWidth": 90,
            "logoCenter": 6,
            "navHoverColor": "#333333",
            "navColor": "#434242"
        },
        "hero": {
            "heading": "¿Soñamos?",
            "description": "Construimos universos donde las marcas dejan de comunicar… y comienzan a trascender.",
            "buttonText": "Agenda una cita",
            "image": "/uploads/1772387829595-milky-way-with-silhouette-of-a-standing-happy-gir-2026-01-06-09-08-16-utc.jpg",
            "imagePositionX": 44,
            "imagePositionY": 100,
            "titleColor": "#f2f2f2",
            "descriptionColor": "#ffffff",
            "imageScale": 138
        },
        "about": {
            "title": "Sobre nosotros",
            "description": "Fundada con la visión de transformar ideas en experiencias memorables...",
            "yearsOfExperience": 7,
            "skills": [
                { "name": "Web Design", "percentage": 80 },
                { "name": "Photoshop", "percentage": 65 }
            ],
            "titleColor": "#0f0f0f",
            "descriptionColor": "#212121"
        },
        "services": [
            {
                "icon": "fab fa-sass",
                "title": "Producción de video",
                "description": "Es el arte de convertir una visión invisible en una experiencia...",
                "image": "/uploads/1772323007653-Video.svg",
                "imageOffsetLeft": -70,
                "imageOffsetTop": 0,
                "imageWidth": 80
            }
        ],
        "experience": [
            {
                "years": "2024",
                "company": "Casa LUMEN",
                "role": "Dirección Creativa",
                "description": "Desarrollamos una narrativa visual..."
            }
        ],
        "experienceTitle": "¿Qué desarrollamos?",
        "projects": [],
        "projectsTitle": "Nuestros Proyectos",
        "projectsViewAllText": "Ver más",
        "testimonials": [],
        "testimonialsTitle": "Testimonios",
        "footer": {
            "email": "hola@onirica.mx",
            "socialLabel": "Síguenos",
            "copyrightText": "Copyright Onírica 2026"
        },
        "colors": {
            "primary": "#0c1236",
            "bgDark": "#1D1D1D",
            "bgLight": "#F5F5F5",
            "bgWhite": "#FFFFFF",
            "textDark": "#e6e6e6",
            "textGray": "#767676",
            "textWhite": "#FFFFFF",
            "headerBorder": "#333333"
        }
    };

    const profile = await prisma.userProfileV2.upsert({
        where: { userId: user.id },
        update: { content: sampleContent },
        create: {
            userId: user.id,
            content: sampleContent
        }
    });

    // Activar el flag para este usuario
    await prisma.user.update({
        where: { id: user.id },
        data: {
            featureOverrides: {
                ...(user.featureOverrides as any || {}),
                profileVersion: "v2"
            }
        }
    });

    console.log("Profile V2 seeded and flag enabled for user:", username);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
