
import { PrismaClient } from "@prisma/client";
import { PLAN_DEFAULTS } from "../lib/plan-defaults";
import { PLANS } from "../lib/plans.config";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Feature Seeding...");

    // 0. Seed Plans (Ensure they exist)
    console.log("Seeding Plans...");
    for (const planKey of Object.keys(PLANS) as Array<keyof typeof PLANS>) {
        const planConfig = PLANS[planKey];
        // PLAN_DEFAULTS keys are uppercase, Plan names in DB are lowercase (usually)
        // schema says name is unique.

        await prisma.plan.upsert({
            where: { name: planConfig.id }, // id in config is 'free', 'pro', etc.
            update: {
                displayName: planConfig.name,
                // We can migrate other fields if needed, but for now we ensure existence
            },
            create: {
                name: planConfig.id,
                displayName: planConfig.name,
                features: "[]", // Legacy required fields
                limits: "{}",   // Legacy required fields
                priceMXN: 0,    // Default
                priceUSD: 0     // Default
            }
        });
    }
    console.log("Plans seeded.");

    // 1. Extract all unique Keys from the most comprehensive plan (AGENCY)
    // We assume AGENCY has all possible features defined.
    // Also merge with limits keys.
    const allFeatureKeys = new Set<string>();

    // Limits used to be separate, but in our new design, they are just features with a numeric limit value.
    // We will treat limits as features with key = limit_key (e.g. "maxProjects")

    const agencyFeatures = PLAN_DEFAULTS.AGENCY.features;
    Object.keys(agencyFeatures).forEach(k => allFeatureKeys.add(k));

    const agencyLimits = PLAN_DEFAULTS.AGENCY.limits;
    Object.keys(agencyLimits).forEach(k => allFeatureKeys.add(k));

    console.log(`Found ${allFeatureKeys.size} unique features/limits.`);

    // 2. Upsert Features
    for (const key of Array.from(allFeatureKeys)) {
        let category = "system";
        if (key.toLowerCase().includes("gallery")) category = "gallery";
        if (key.toLowerCase().includes("social")) category = "profile";
        if (key.toLowerCase().includes("scena")) category = "scena";
        if (key.toLowerCase().includes("project")) category = "scena";
        if (key.toLowerCase().includes("download")) category = "gallery";
        if (key.toLowerCase().includes("video")) category = "video";
        if (key.toLowerCase().includes("payment")) category = "payments";
        if (key.toLowerCase().includes("stripe")) category = "payments";

        await prisma.feature.upsert({
            where: { key },
            update: {},
            create: {
                key,
                description: `Automatically seeded feature: ${key}`,
                category,
                defaultValue: false
            }
        });
    }
    console.log("Features synced.");

    // 3. Sync Plan Features
    for (const [planName, config] of Object.entries(PLAN_DEFAULTS)) {
        const normalizedName = planName.toLowerCase();
        console.log(`Processing Plan: ${normalizedName}`);

        const plan = await prisma.plan.findUnique({
            where: { name: normalizedName }
        });

        if (!plan) {
            console.warn(`Plan '${normalizedName}' not found in DB. Skipping.`);
            continue;
        }

        // Sync Features (Boolean flags)
        for (const [key, value] of Object.entries(config.features)) {
            const feature = await prisma.feature.findUnique({ where: { key } });
            if (!feature) continue;

            const enabled = Boolean(value);
            // Some "features" in the old config might have string values (like zipDownloadsEnabled = 'static_only')
            // For this migration, we treat truthy as enabled. The specifics of 'static_only' might need metadata later or separate features.
            // For now, if it's not false/null/undefined, it's enabled.

            await prisma.planFeature.upsert({
                where: {
                    planId_featureId: {
                        planId: plan.id,
                        featureId: feature.id
                    }
                },
                update: {
                    enabled: !!value,
                    limit: null // Features are usually boolean, so limit is null
                },
                create: {
                    planId: plan.id,
                    featureId: feature.id,
                    enabled: !!value,
                    limit: null
                }
            });
        }

        // Sync Limits (Numeric constraints)
        for (const [key, value] of Object.entries(config.limits)) {
            const feature = await prisma.feature.findUnique({ where: { key } });
            if (!feature) continue;

            // In the old config, -1 meant unlimited.
            // In our new schema, limit: null means unlimited.
            // value 0 usually meant disabled or 0 allowed. 
            // We need to be careful. In limits object:
            // maxProjects: 3 -> limit: 3
            // maxProjects: -1 -> limit: null
            // maxProjects: 0 -> limit: 0 (or enabled: false?)

            let limitValue: number | null = value as number;

            if (limitValue === -1) {
                limitValue = null;
            }

            await prisma.planFeature.upsert({
                where: {
                    planId_featureId: {
                        planId: plan.id,
                        featureId: feature.id
                    }
                },
                update: {
                    enabled: true, // Limits exist, so the constraint is "enabled"
                    limit: limitValue
                },
                create: {
                    planId: plan.id,
                    featureId: feature.id,
                    enabled: true,
                    limit: limitValue
                }
            });
        }
    }

    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
