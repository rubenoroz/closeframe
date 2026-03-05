export const PLANS = {
    FREE: {
        id: 'free',
        name: 'Free',
        limits: {
            bioMaxLength: 150,
            maxSocialLinks: 1, // Only Instagram
            bookingWindow: 0, // Disabled
            maxProjects: 3,
            maxCloudAccounts: 1,
            maxScenaProjects: 0,
            maxNodosProjects: 0,
            commissionPercentage: 15, // 15% commission for Free
        },
        features: {
            advancedSocialNetworks: false,
            callToAction: false,
            hideBranding: false,
            manualOrdering: false,
            listView: false,
            bookingConfig: false,
            zipDownloadsEnabled: false,
            musicGallery: false,
            videoGallery: false,
            externalVideoAuth: false,
            calendarSync: false,
            scenaAccess: true,
            nodosAccess: true,
            lowResDownloads: false, // Updated to match user request (disabled for free)
            highResDownloads: false,
            selectiveDownload: true,
        },
        marketingFeatures: [
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
        ]
    },
    FAMILY: {
        id: 'family',
        name: 'Family',
        limits: {
            bioMaxLength: 300,
            maxSocialLinks: 3,
            bookingWindow: 0,
            maxProjects: 50,
            maxCloudAccounts: 2,
            maxScenaProjects: 3,
            maxNodosProjects: 5,
            commissionPercentage: 12, // 12% commission for Family
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: false,
            listView: true,
            bookingConfig: false,
            zipDownloadsEnabled: 'static_only',
            musicGallery: false,
            videoGallery: true,
            externalVideoAuth: false,
            collaborativeGalleries: true,
            calendarSync: true,
            scenaAccess: true,
            nodosAccess: true,
            lowResDownloads: true,
            highResDownloads: true,
            selectiveDownload: true,
        },
        marketingFeatures: [
            "Perfil público profesional",
            "Bio extendida",
            "Hasta 50 galerías",
            "Hasta 2 nubes enlazadas",
            "Galería de video",
            "Descargas en alta resolución",
            "Sincronización de calendario",
            "Acceso a Scena y Nodos"
        ]
    },
    PRO: {
        id: 'pro',
        name: 'Pro',
        limits: {
            bioMaxLength: 500,
            maxSocialLinks: -1, // Unlimited
            bookingWindow: 4, // Default 4 weeks
            maxProjects: 100,
            maxCloudAccounts: 2,
            maxScenaProjects: 10,
            maxNodosProjects: 20,
            commissionPercentage: 5, // 5% commission for Pro
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
            zipDownloadsEnabled: 'static_only',
            musicGallery: false,
            videoGallery: false, // Reverted to false
            externalVideoAuth: false,
            calendarSync: true,
            scenaAccess: true,
            nodosAccess: true,
            lowResDownloads: true,
            highResDownloads: true,
            selectiveDownload: true,
        },
        marketingFeatures: [
            "Perfil público profesional",
            "Bio extendida",
            "Campos personalizados",
            "Imagen de portada",
            "Ocultar branding",
            "Hasta 100 galerías",
            "Soporte de video nativo",
            "Orden manual",
            "Descargas en alta resolución",
            "Integración con Stripe"
        ]
    },
    STUDIO: {
        id: 'studio',
        name: 'Studio',
        limits: {
            bioMaxLength: 1000,
            maxSocialLinks: -1,
            bookingWindow: 0, // Unlimited
            maxProjects: -1,
            maxCloudAccounts: -1,
            maxScenaProjects: -1,
            maxNodosProjects: -1,
            commissionPercentage: 0, // 0% commission for Studio
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
            zipDownloadsEnabled: true, // Studio users get full dynamic ZIPs
            musicGallery: true,
            videoGallery: true,
            externalVideoAuth: false,
            collaborativeGalleries: true,
            calendarSync: true,
            scenaAccess: true,
            nodosAccess: true,
            lowResDownloads: true,
            highResDownloads: true,
            selectiveDownload: true,
        },
        marketingFeatures: [
            "Todo lo de Pro",
            "Galerías ilimitadas",
            "Nubes ilimitadas",
            "Galerías colaborativas",
            "Música en galerías",
            "Descargas ZIP dinámicas",
            "Cero comisión por venta",
            "Soporte prioritario"
        ]
    },
    AGENCY: {
        id: 'agency',
        name: 'Agency',
        limits: {
            bioMaxLength: 2000,
            maxSocialLinks: -1,
            bookingWindow: 0,
            maxProjects: -1,
            maxCloudAccounts: -1,
            maxScenaProjects: -1,
            maxNodosProjects: -1,
            commissionPercentage: 0, // 0% commission for Agency
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
            zipDownloadsEnabled: true,
            musicGallery: true,
            videoGallery: true,
            externalVideoAuth: true,
            collaborativeGalleries: true,
            calendarSync: true,
            scenaAccess: true,
            nodosAccess: true,
            lowResDownloads: true,
            highResDownloads: true,
            selectiveDownload: true,
        },
        marketingFeatures: [
            "Todo lo de Studio",
            "Autenticación externa de video",
            "Multi-usuario avanzado",
            "Soporte VIP"
        ]
    }
} as const;

export type PlanType = keyof typeof PLANS;

export function getPlanConfig(planName?: string | null) {
    if (!planName) return PLANS.FREE;

    const normalizedName = planName.toUpperCase();

    // Handle name variations and suffixes (e.g. 'Agency-Monthly', 'Plan Studio')
    if (normalizedName.includes('AGENCY')) return PLANS.AGENCY;
    if (normalizedName.includes('STUDIO') || normalizedName.includes('ESTUDIO')) return PLANS.STUDIO;
    if (normalizedName.includes('FAMILY') || normalizedName.includes('FAMILIA')) return PLANS.FAMILY;
    if (normalizedName.includes('PRO') || normalizedName.includes('PROFESIONAL')) return PLANS.PRO;
    if (normalizedName.includes('FREE') || normalizedName.includes('PERSONAL')) return PLANS.FREE;

    return PLANS.FREE;
}

export function getEffectivePlanConfig(baseConfig: any, overrides?: any) {
    // If baseConfig is a string (legacy plan name), fetch static config
    if (typeof baseConfig === 'string') {
        baseConfig = getPlanConfig(baseConfig);
    }

    // If no baseConfig provided (e.g. user has no plan), fallback to FREE static
    if (!baseConfig) {
        baseConfig = PLANS.FREE;
    }

    if (!overrides) return baseConfig;

    // Deep merge limits and features
    return {
        ...baseConfig,
        limits: {
            ...baseConfig.limits,
            ...overrides.limits,
            ...overrides // Backwards compatibility
        },
        features: {
            ...baseConfig.features,
            ...overrides.features,
            ...overrides // Backwards compatibility
        }
    };
}
