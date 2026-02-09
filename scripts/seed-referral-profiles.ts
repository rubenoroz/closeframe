import { PrismaClient } from "@prisma/client";

// Inline config to avoid ESM import issues
const DEFAULT_AFFILIATE_CONFIG = {
    reward: {
        type: 'PERCENTAGE',
        percentage: 0.15,
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

const DEFAULT_CUSTOMER_CONFIG = {
    reward: {
        type: 'PERCENTAGE',
        percentage: 0.10, // 10% credit on next bill
    },
    calculationBase: 'EACH_PAYMENT',
    duration: {
        type: 'PERMANENT',
    },
    limits: {
        maxActiveReferrals: 50,
        maxReferralsPerMonth: 10,
        maxReferralsPerYear: 50,
    },
    qualification: {
        gracePeriodDays: 0, // Immediate credit
        minSubscriptionDays: 0,
    },
    // Customer referrals give account credit, not monetary payout
    rewardType: 'CREDIT', // Used to distinguish from AFFILIATE monetary payouts
};

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding default referral profiles...");

    // Create default AFFILIATE profile
    const affiliateProfile = await prisma.referralProfile.upsert({
        where: { id: "default-affiliate" },
        update: {
            config: DEFAULT_AFFILIATE_CONFIG
        },
        create: {
            id: "default-affiliate",
            name: "Afiliado Estándar",
            type: "AFFILIATE",
            isDefault: true,
            isActive: true,
            config: DEFAULT_AFFILIATE_CONFIG
        }
    });
    console.log(`✅ Affiliate profile: ${affiliateProfile.name}`);

    // Create default CUSTOMER profile
    const customerProfile = await prisma.referralProfile.upsert({
        where: { id: "default-customer" },
        update: {
            config: DEFAULT_CUSTOMER_CONFIG
        },
        create: {
            id: "default-customer",
            name: "Cliente Embajador",
            type: "CUSTOMER",
            isDefault: true,
            isActive: true,
            config: DEFAULT_CUSTOMER_CONFIG
        }
    });
    console.log(`✅ Customer profile: ${customerProfile.name}`);

    // Create premium affiliate profile
    const premiumAffiliateConfig = {
        ...DEFAULT_AFFILIATE_CONFIG,
        reward: {
            type: "HYBRID" as const,
            percentage: 0.20, // 20%
            fixedAmount: 100 // $100 bonus per conversion
        },
        tiers: [
            { minReferrals: 0, percentage: 0.15 },
            { minReferrals: 10, percentage: 0.20 },
            { minReferrals: 50, percentage: 0.25 },
        ],
        qualification: {
            gracePeriodDays: 14, // Shorter grace period
            minSubscriptionDays: 14
        }
    };

    const premiumAffiliate = await prisma.referralProfile.upsert({
        where: { id: "premium-affiliate" },
        update: {
            config: premiumAffiliateConfig
        },
        create: {
            id: "premium-affiliate",
            name: "Afiliado Premium",
            type: "AFFILIATE",
            isDefault: false,
            isActive: true,
            config: premiumAffiliateConfig
        }
    });
    console.log(`✅ Premium affiliate profile: ${premiumAffiliate.name}`);

    console.log("\n🎉 Referral profiles seeded successfully!");
}

main()
    .catch((e) => {
        console.error("Error seeding referral profiles:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
