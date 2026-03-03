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
    image: string;
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
    experienceVisible?: boolean;
    projects: ProjectItem[];
    projectsTitle: string;
    projectsTitleColor?: string;
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
}

export const defaultTemplateContent: TemplateContent = {
    header: {
        logoText: "",
        logoImage: "",
        logoCenter: 50,
        logoWidth: 120,
        navigation: [
            { label: "Inicio", url: "#home", visible: true },
            { label: "Acerca de", url: "#about", visible: true },
            { label: "Experiencia", url: "#experience", visible: true },
            { label: "Proyectos", url: "#projects", visible: true },
            { label: "Testimonios", url: "#testimonials", visible: true },
        ],
        socials: [],
    },
    hero: {
        heading: "",
        description: "",
        buttonText: "Contáctanos",
        image: "",
        imagePositionX: 50,
        imagePositionY: 50,
        imageScale: 100,
        visible: true,
    },
    about: {
        title: "",
        description: "",
        yearsOfExperience: 0,
        skills: [],
        visible: true,
    },
    services: [
        { icon: "fas fa-globe", title: "Servicio 1", description: "", image: "", imageWidth: 80, imageOffsetTop: 0, imageOffsetLeft: 0 },
        { icon: "fas fa-camera", title: "Servicio 2", description: "", image: "", imageWidth: 80, imageOffsetTop: 0, imageOffsetLeft: 0 },
        { icon: "fas fa-palette", title: "Servicio 3", description: "", image: "", imageWidth: 80, imageOffsetTop: 0, imageOffsetLeft: 0 },
    ],
    servicesConfig: {
        offsetLeft: 0,
        offsetTop: 0,
        widthAddition: 0,
        visible: true,
    },
    experience: [],
    experienceTitle: "Experiencia",
    experienceVisible: true,
    projects: [],
    projectsTitle: "Proyectos Destacados",
    projectsVisible: true,
    projectsViewAllText: "Ver todos los proyectos",
    testimonials: [],
    testimonialsTitle: "Testimonios",
    testimonialsVisible: true,
    footer: {
        email: "",
        socialLabel: "Síguenos en",
        copyrightText: "",
    },
    colors: {
        primary: "#0C1236",
        bgDark: "#1d1d1d",
        bgLight: "#f5f5f5",
        bgWhite: "#ffffff",
        textDark: "#E6E6E6",
        textGray: "#767676",
        textWhite: "#FFFFFF",
        headerBorder: "#333333",
    },
    cta: {
        buttonText: "Contáctanos",
        reservationWindow: "4 Semanas",
        minAnticipationDays: 0,
        buttonVisible: true,
    },
    username: "",
    layout: {
        column1: ["username", "colors", "about", "experience"],
        column2: ["header", "hero", "testimonials"],
        column3: ["services", "projects", "footer"]
    }
};
