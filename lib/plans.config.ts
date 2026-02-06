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
        },
        features: {
            advancedSocialNetworks: false,
            callToAction: false,
            hideBranding: false,
            manualOrdering: false,
            listView: false,
            bookingConfig: false,
            zipDownloadsEnabled: false,
            closerGallery: false,
            musicGallery: false,
            videoGallery: false,
            externalVideoAuth: false,
            calendarSync: false,
            scenaAccess: true,
        }
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
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: false,
            listView: true,
            bookingConfig: false,
            zipDownloadsEnabled: 'static_only',
            closerGallery: true,
            musicGallery: false,
            videoGallery: true,
            externalVideoAuth: false,
            collaborativeGalleries: true,
            calendarSync: true,
            scenaAccess: true,
        }
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
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
            zipDownloadsEnabled: 'static_only', // Pro users use efficient static ZIPs
            closerGallery: false,
            musicGallery: false,
            videoGallery: false, // Reverted to false
            externalVideoAuth: false,
            calendarSync: true,
            scenaAccess: true,
        }
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
            closerGalleryLimit: 10,
            maxScenaProjects: -1,
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
            zipDownloadsEnabled: true, // Studio users get full dynamic ZIPs
            closerGallery: true,
            musicGallery: true,
            videoGallery: true,
            externalVideoAuth: false,
            collaborativeGalleries: true,
            calendarSync: true,
            scenaAccess: true,
        }
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
            closerGalleryLimit: -1,
            maxScenaProjects: -1,
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
            zipDownloadsEnabled: true,
            closerGallery: true,
            musicGallery: true,
            videoGallery: true,
            externalVideoAuth: true,
            collaborativeGalleries: true,
            calendarSync: true,
            scenaAccess: true,
        }
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
