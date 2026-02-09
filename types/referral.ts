// Types for Referral System Configuration

// For AFFILIATE (Vendedor/Afiliado)
export interface AffiliateProfileConfig {
    reward: {
        type: 'PERCENTAGE' | 'FIXED' | 'HYBRID';
        percentage?: number;      // 0.15 = 15%
        fixedAmount?: number;     // $50 por conversión
    };
    calculationBase: 'FIRST_PAYMENT' | 'RECURRING' | 'LIFETIME' | 'MRR';
    duration: {
        type: 'ONE_TIME' | 'MONTHS' | 'PERMANENT' | 'CAPPED';
        months?: number;          // Si es MONTHS
        maxAmount?: number;       // Si es CAPPED
    };
    limits: {
        maxActiveReferrals?: number;
        maxMonthlyCommission?: number;
        maxAnnualCommission?: number;
    };
    tiers?: Array<{
        minReferrals: number;
        percentage: number;
    }>;
    qualification: {
        gracePeriodDays: number;  // Días antes de liberar comisión
        minSubscriptionDays?: number;
    };
    payoutSettings: {
        minThreshold: number;     // Mínimo para solicitar payout
        autoPayoutEnabled: boolean;
        autoPayoutDay?: number;   // Día del mes
    };
}

// For CUSTOMER (Cliente)
export interface CustomerProfileConfig {
    referrerBenefit: {
        type: 'PERCENTAGE_DISCOUNT' | 'CREDIT' | 'FREE_MONTHS' | 'PLAN_UPGRADE';
        value: number;            // 20 = 20% o $20 o 2 meses
        duration?: number;        // Meses que aplica el descuento
        maxAmount?: number;       // Tope de descuento
    };
    referredBenefit: {
        type: 'PERCENTAGE_DISCOUNT' | 'CREDIT' | 'FREE_MONTHS';
        value: number;
        duration?: number;
    };
    conditions: {
        minSpend?: number;
        requiredPlans?: string[]; // IDs de planes elegibles
        excludeTrials: boolean;
    };
    limits: {
        maxReferralsPerMonth?: number;
        maxReferralsPerYear?: number;
        maxTotalDiscount?: number;
    };
    stackability: {
        stackWithPromotions: boolean;
        stackWithOtherReferrals: boolean;
    };
}

export type ReferralProfileConfig = AffiliateProfileConfig | CustomerProfileConfig;

// Default configurations for quick profile creation
export const DEFAULT_AFFILIATE_CONFIG: AffiliateProfileConfig = {
    reward: {
        type: 'PERCENTAGE',
        percentage: 0.15, // 15%
    },
    calculationBase: 'FIRST_PAYMENT',
    duration: {
        type: 'PERMANENT',
    },
    limits: {
        maxActiveReferrals: 100,
        maxMonthlyCommission: 10000,
    },
    tiers: [
        { minReferrals: 0, percentage: 0.10 },
        { minReferrals: 5, percentage: 0.15 },
        { minReferrals: 20, percentage: 0.20 },
    ],
    qualification: {
        gracePeriodDays: 30,
        minSubscriptionDays: 30,
    },
    payoutSettings: {
        minThreshold: 500,
        autoPayoutEnabled: true,
        autoPayoutDay: 15,
    },
};

export const DEFAULT_CUSTOMER_CONFIG: CustomerProfileConfig = {
    referrerBenefit: {
        type: 'PERCENTAGE_DISCOUNT',
        value: 20, // 20% discount
        duration: 3, // for 3 months
    },
    referredBenefit: {
        type: 'PERCENTAGE_DISCOUNT',
        value: 15, // 15% discount
        duration: 1, // for 1 month
    },
    conditions: {
        excludeTrials: true,
    },
    limits: {
        maxReferralsPerMonth: 10,
        maxReferralsPerYear: 50,
    },
    stackability: {
        stackWithPromotions: false,
        stackWithOtherReferrals: false,
    },
};

// Helper to generate unique referral codes
export function generateReferralCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Cookie name for tracking
export const REFERRAL_COOKIE_NAME = 'cl_ref';
export const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
