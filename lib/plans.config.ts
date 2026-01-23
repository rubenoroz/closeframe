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
        },
        features: {
            advancedSocialNetworks: false,
            callToAction: false,
            hideBranding: false,
            manualOrdering: false,
            listView: false,
            bookingConfig: false,
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
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
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
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
        }
    }
} as const;

export type PlanType = keyof typeof PLANS;

export function getPlanConfig(planName?: string | null) {
    if (!planName) return PLANS.FREE;

    const normalizedName = planName.toUpperCase();
    if (normalizedName === 'PRO') return PLANS.PRO;
    if (normalizedName === 'STUDIO') return PLANS.STUDIO;

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
            ...overrides.limits, // Allow overriding specific limits e.g. { "bioMaxLength": 1000 }
            ...overrides // Backwards compatibility if they put limits at root
        },
        features: {
            ...baseConfig.features,
            ...overrides.features, // Allow overriding specific features e.g. { "advancedSocialNetworks": true }
            ...overrides // Backwards compatibility
        }
    };
}
