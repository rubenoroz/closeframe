export interface ServiceItem {
    icon?: string;
    image?: string;
    imageWidth?: number;
    imageOffsetTop?: number;
    imageOffsetLeft?: number;
    title: string;
    description: string;
}

export interface ProjectItem {
    id: string;
    title: string;
    category?: string;
    image?: string;
    galleryId?: string;
    gallerySlug?: string;
    showAsCollage?: boolean;
    externalLink?: string;
    details: {
        clients?: string;
        completion?: string;
        role?: string;
        authors?: string;
        detailImage?: string;
    };
}

export interface TestimonialItem {
    quote: string;
    author: string;
    role: string;
}

export interface ThemeColors {
    primary: string;
    bgDark: string;
    bgLight: string;
    bgWhite: string;
    textDark: string;
    textGray: string;
    textWhite: string;
    headerBorder: string;
}

export interface TemplateContent {
    header: {
        logoText: string;
        logoImage?: string;
        logoCenter?: number;
        logoWidth?: number;
        galleryLogoWidth?: number; // [NEW] Independent scale for galleries
        navigation: { label: string; url: string; visible?: boolean }[];
        socials: { icon: string; url: string }[];
        navColor?: string;
        navHoverColor?: string;
    };
    hero: {
        heading: string;
        description: string;
        buttonText: string;
        image?: string;
        imagePositionX?: number;
        imagePositionY?: number;
        imageScale?: number;
        imageBrightness?: number;
        imageBlur?: number;
        titleColor?: string;
        descriptionColor?: string;
        visible?: boolean;
    };
    about: {
        title: string;
        description: string;
        yearsOfExperience: number;
        skills: { name: string; percentage: number }[];
        titleColor?: string;
        descriptionColor?: string;
        visible?: boolean;
    };
    services: ServiceItem[];
    servicesConfig?: {
        offsetLeft: number;
        offsetTop: number;
        widthAddition: number;
        titleColor?: string;
        visible?: boolean;
    };
    experience: {
        years: string;
        company: string;
        role: string;
        description: string;
    }[];
    experienceTitle: string;
    experienceTitleColor?: string;
    experienceItemRoleColor?: string;
    experienceItemCompanyColor?: string;
    experienceItemPeriodColor?: string;
    experienceItemDescriptionColor?: string;
    experienceVisible?: boolean;
    projects: ProjectItem[];
    projectsTitle: string;
    projectsTitleColor?: string;
    projectsItemTitleColor?: string;
    projectsItemCategoryColor?: string;
    projectsItemCategoryBgColor?: string;
    projectsVisible?: boolean;
    projectsViewAllText: string;
    testimonials: TestimonialItem[];
    testimonialsTitle: string;
    testimonialsTitleColor?: string;
    testimonialsVisible?: boolean;
    footer: {
        email: string;
        socialLabel: string;
        copyrightText: string;
        emailColor?: string;
        socialLabelColor?: string;
        copyrightColor?: string;
    };
    colors: ThemeColors;
    cta?: {
        buttonText: string;
        reservationWindow: string;
        minAnticipationDays: number;
        buttonVisible?: boolean;
    };
    username?: string;
    publicGalleries?: {
        id: string;
        title: string;
        image: string;
        enabled: boolean;
    }[];
    layout?: {
        column1: string[];
        column2: string[];
        column3: string[];
    };
    businessName?: string;
}

export const defaultTemplateContent: TemplateContent = {
    header: {
        logoText: "TU MARCA",
        logoImage: "",
        logoCenter: 50,
        logoWidth: 120,
        galleryLogoWidth: 120,
        navigation: [
            { label: "Inicio", url: "#home", visible: true },
            { label: "Acerca de", url: "#about", visible: true },
            { label: "Servicios", url: "#services", visible: true },
            { label: "Galerías", url: "#projects", visible: true },
            { label: "Testimonios", url: "#testimonials", visible: true },
        ],
        socials: [],
    },
    hero: {
        heading: "Elevando tu presencia visual al siguiente nivel",
        description: "Bienvenido a mi nuevo portafolio digital. Aquí podrás explorar mis últimos proyectos, servicios profesionales y agendar una colaboración conmigo en un solo clic.",
        buttonText: "Agenda una Sesión",
        image: "/hero-photographer.jpg",
        imagePositionX: 50,
        imagePositionY: 50,
        imageScale: 100,
        visible: true,
    },
    about: {
        title: "Pasión por el detalle",
        description: "Soy un creativo dedicado a transformar ideas en experiencias visuales memorables. Mi enfoque se centra en la calidad tecnológica y la narrativa artística, asegurando que cada proyecto cuente una historia única y poderosa.",
        yearsOfExperience: 5,
        skills: [
            { name: "Fotografía Editorial", percentage: 95 },
            { name: "Dirección de Arte", percentage: 85 },
            { name: "Post-Postproducción", percentage: 90 }
        ],
        visible: true,
    },
    services: [
        {
            icon: "fas fa-camera",
            title: "Producción Audiovisual",
            description: "Cobertura completa para eventos, moda y proyectos corporativos con los más altos estándares.",
            image: "/gallery-showcase.jpg",
            imageWidth: 80,
            imageOffsetTop: 0,
            imageOffsetLeft: 0
        },
        {
            icon: "fas fa-palette",
            title: "Dirección Creativa",
            description: "Conceptualización de marcas y campañas visuales que impactan y perduran en la audiencia.",
            image: "/studio-showcase.jpg",
            imageWidth: 80,
            imageOffsetTop: 0,
            imageOffsetLeft: 0
        },
        {
            icon: "fas fa-magic",
            title: "Consultoría de Marca",
            description: "Asesoría estratégica para optimizar tu presencia digital y narrativa visual profesional.",
            image: "/organize-showcase.jpg",
            imageWidth: 80,
            imageOffsetTop: 0,
            imageOffsetLeft: 0
        },
    ],
    servicesConfig: {
        offsetLeft: 0,
        offsetTop: 0,
        widthAddition: 0,
        visible: true,
    },
    experience: [
        {
            years: "Presente",
            company: "Estudio Creativo",
            role: "Lead Creative",
            description: "Liderando proyectos de alto impacto para marcas internacionales."
        }
    ],
    experienceTitle: "Mi Trayectoria",
    experienceVisible: true,
    projects: [],
    projectsTitle: "Galerías Destacadas",
    projectsVisible: true,
    projectsViewAllText: "Ver todos los proyectos",
    projectsItemCategoryBgColor: "rgba(0,0,0,0.5)",
    testimonials: [
        {
            author: "Cliente de Ejemplo",
            role: "Marketing Manager",
            quote: "Trabajar con este estudio fue una experiencia transformadora. La atención al detalle y la profesionalidad superaron todas nuestras expectativas."
        }
    ],
    testimonialsTitle: "Lo que dicen de nosotros",
    testimonialsVisible: true,
    footer: {
        email: "tu@email.com",
        socialLabel: "Sígueme en mis redes",
        copyrightText: `© ${new Date().getFullYear()} Tu Marca Digital`,
    },
    colors: {
        primary: "#23a592", // emerald-ish color consistent with closerlens
        bgDark: "#101010",
        bgLight: "#f8f8f8",
        bgWhite: "#ffffff",
        textDark: "#1a1a1a",
        textGray: "#666666",
        textWhite: "#ffffff",
        headerBorder: "#222222",
    },
    cta: {
        buttonText: "Contáctame",
        reservationWindow: "4 Semanas",
        minAnticipationDays: 2,
        buttonVisible: true,
    },
    username: "",
    layout: {
        column1: ["username", "colors", "about", "experience"],
        column2: ["header", "hero", "testimonials"],
        column3: ["services", "projects", "footer"]
    }
};
