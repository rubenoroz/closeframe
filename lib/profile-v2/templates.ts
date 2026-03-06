import { TemplateContent, defaultTemplateContent } from "@/types/profile-v2";

/**
 * Generates an initial profile template based on the "angular.tv@gmail.com" profile structure
 * which serves as the official tutorial template.
 * This is a 100% exact replica as requested.
 */
export function getInitialProfileData(user: {
    name?: string | null;
    image?: string | null;
    businessName?: string | null;
    businessLogo?: string | null;
    bio?: string | null;
}): TemplateContent {
    const name = user.name || "Tu Nombre";
    const businessName = user.businessName || name || "Tu Empresa";

    return {
        ...defaultTemplateContent,
        businessName: businessName,
        header: {
            ...defaultTemplateContent.header,
            logoText: "",
            logoImage: "/tutorials/tutorial-logo.png",
            logoWidth: 164,
            logoCenter: 5,
            navigation: [
                { url: "#home", label: "Inicio", visible: true },
                { url: "#about", label: "Acerca de", visible: true },
                { url: "#services", label: "Servicios", visible: true },
                { url: "#projects", label: "Galerías", visible: true },
                { url: "#testimonials", label: "Testimonios", visible: true }
            ],
            socials: [
                { url: "https://www.instagram.com/somoscloserlens", icon: "fab fa-instagram" },
                { url: "https://www.youtube.com/@SomosCloserLens", icon: "fab fa-youtube" },
                { url: "https://closerlens.com", icon: "fas fa-globe" }
            ],
        },
        hero: {
            ...defaultTemplateContent.hero,
            heading: "Bienvenido a Closerlens",
            description: "Con Closerlens puedes organizar tus galerías, gestionar proyectos creativos, agendar sesiones con tus clientes y recibir pagos por tu trabajo, todo en un solo lugar.",
            buttonText: "Agenda una Sesión",
            image: "/tutorials/tutorial-hero.jpg",
            imagePositionX: 50,
            imagePositionY: 50,
            imageScale: 100,
            visible: true
        },
        about: {
            ...defaultTemplateContent.about,
            title: "Bienvenido a este perfil de demostración de Closerlens.",
            description: "Closerlens es una plataforma diseñada para fotógrafos, videógrafos y estudios creativos que buscan mostrar su trabajo de forma profesional y gestionar sus proyectos en un solo lugar.\n\nCon Closerlens puedes crear un perfil público, organizar tu portafolio en galerías, gestionar proyectos creativos, compartir avances con clientes, entregar materiales finales y mantener todo tu flujo de trabajo organizado. También puedes permitir que tus clientes agenden sesiones o reuniones directamente desde tu perfil.\n\nAdemás, Closerlens integra herramientas para recibir pagos por tus servicios, facilitando la gestión de tu trabajo creativo y tu negocio desde una sola plataforma. De esta forma, tu perfil no solo funciona como portafolio, sino también como un espacio donde puedes presentar tu trabajo, organizar tus producciones y administrar la relación con tus clientes de manera simple y profesional.",
            yearsOfExperience: 5,
            skills: [
                { name: "Agenda", percentage: 100 },
                { name: "Nodos, Gantt y kanban", percentage: 100 },
                { name: "ENTREGA A CLIENTES", percentage: 100 },
                { name: "cobros", percentage: 100 },
                { name: "conecta tus nubes", percentage: 100 },
                { name: "Tu propio perfil", percentage: 100 }
            ],
            visible: true
        },
        services: [
            {
                icon: "fas fa-camera",
                image: "/tutorials/tutorial-service-1.png",
                title: "Todo en un solo lugar",
                description: "Closerlens integra portafolio, gestión de proyectos, galerías, agenda de citas y pagos en una sola plataforma, simplificando el flujo de trabajo de los creativos visuales.",
                imageWidth: 234,
                imageOffsetTop: 0,
                imageOffsetLeft: 0
            },
            {
                icon: "fas fa-palette",
                image: "/tutorials/tutorial-service-2.png",
                title: "Presentación profesional del trabajo",
                description: "Permite mostrar proyectos y galerías de forma clara, elegante y organizada, ayudando a fotógrafos, videógrafos y estudios a presentar su trabajo de manera profesional ante clientes.",
                imageWidth: 234,
                imageOffsetTop: 0,
                imageOffsetLeft: 0
            },
            {
                icon: "fas fa-magic",
                image: "/tutorials/tutorial-service-3.png",
                title: "Enfoque en creativos visuales",
                description: "Closerlens está diseñado específicamente para las necesidades de fotógrafos, videógrafos y equipos de producción, facilitando la organización de proyectos, la colaboración y la relación con clientes.",
                imageWidth: 234,
                imageOffsetTop: 0,
                imageOffsetLeft: 0
            }
        ],
        experience: [
            {
                role: "Muestra tu Perfil",
                years: "Presenta con tus Clientes",
                company: "Tus Proyectos",
                description: "Y en tu perfil profesional, si algo no te funciona, ocúltalo."
            }
        ],
        experienceTitle: "Muestra tu Trayectoria",
        experienceVisible: true,
        testimonials: [
            {
                role: "Fundador",
                author: "Rubén Oroz",
                quote: "Creamos esta plataforma con una idea muy clara: que los creativos visuales tengan un espacio donde puedan mostrar su trabajo de forma profesional y, al mismo tiempo, gestionar su negocio sin complicaciones. Sabemos que detrás de cada proyecto hay talento, esfuerzo y una historia que merece presentarse con la misma calidad con la que fue creada.\n\nCloserlens nace para ayudarte a organizar tu portafolio, gestionar tus proyectos, trabajar con clientes y hacer crecer tu trabajo creativo desde un solo lugar.\n\nGracias por ser parte de esta comunidad."
            }
        ],
        testimonialsTitle: "Lo que dicen nuestros fundadores",
        testimonialsVisible: true,
        projects: [
            {
                id: "1",
                title: "Closerlens",
                category: "Nuestro Sitio",
                externalLink: "https://closerlens.com",
                details: { clients: "Closerlens", role: "Official Site" }
            },
            {
                id: "2",
                title: "Closerlens",
                category: "Nuestro Sitio",
                externalLink: "https://closerlens.com",
                details: { clients: "Closerlens", role: "Official Site" }
            },
            {
                id: "3",
                title: "Closerlens",
                category: "Nuestro Sitio",
                externalLink: "https://closerlens.com",
                details: { clients: "Closerlens", role: "Official Site" }
            },
            {
                id: "4",
                title: "Closerlens",
                category: "Nuestro Sitio",
                externalLink: "https://closerlens.com",
                details: { clients: "Closerlens", role: "Official Site" }
            }
        ],
        projectsTitle: "Galerías Destacadas",
        projectsViewAllText: "Ver todos los proyectos",
        projectsVisible: true,
        projectsItemCategoryColor: "#fafafa",
        projectsItemCategoryBgColor: "#9c9c9c",
        colors: {
            bgDark: "#101010",
            bgLight: "#f8f8f8",
            bgWhite: "#ffffff",
            primary: "#235ba4",
            textDark: "#1a1a1a",
            textGray: "#666666",
            textWhite: "#ffffff",
            headerBorder: "#222222"
        },
        layout: {
            column1: ["username", "colors", "about", "experience"],
            column2: ["header", "hero", "testimonials"],
            column3: ["services", "projects", "footer"]
        },
        footer: {
            ...defaultTemplateContent.footer,
            copyrightText: `© ${new Date().getFullYear()} Closerlens`,
            email: "hola@closerlens.com",
            socialLabel: "Síguenos"
        },
        cta: {
            buttonText: "Agenda una sesión",
            buttonVisible: true,
            reservationWindow: "4 Semanas",
            minAnticipationDays: 2
        }
    };
}
