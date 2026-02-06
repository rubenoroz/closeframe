
import { PrismaClient } from '@prisma/client';
import { PLANS } from '../lib/plans.config';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Plan Feature Sync from Code to DB...");

    for (const [planKey, planConfig] of Object.entries(PLANS)) {
        console.log(`Syncing Plan: ${planConfig.name} (Key: ${planKey}, ID: ${planConfig.id})`);

        // Match by Name (DB stores 'free', 'pro' in name column usually, or slug)
        // Since we saw DB IDs are CUIDs, we must match by name column.
        let dbPlan = await prisma.plan.findFirst({
            where: {
                OR: [
                    { name: planConfig.id },                 // 'free'
                    { name: planConfig.name },               // 'Free'
                    { name: planConfig.name.toLowerCase() }  // 'free'
                ]
            }
        });

        if (!dbPlan) {
            console.log(`⚠️ Plan ${planConfig.name} not found in DB. Skipping.`);
            continue;
        }

        console.log(`Found DB Plan: ${dbPlan.name} (${dbPlan.id})`);

        // Sync Features
        for (const [featureKey, featureValue] of Object.entries(planConfig.features)) {
            // Find the feature definition
            let dbFeature = await prisma.feature.findUnique({ where: { key: featureKey } });

            if (!dbFeature) {
                console.log(`Creating missing feature definition: ${featureKey}`);
                dbFeature = await prisma.feature.create({
                    data: {
                        key: featureKey,
                        category: 'system',
                        description: `Auto-created from sync: ${featureKey}`,
                        defaultValue: false
                    }
                });
            }

            // Sync PlanFeature
            const isEnabled = featureValue === true || featureValue === 'static_only';
            // Note: 'static_only' is effectively true for 'enabled' flag, specific logic handled in code

            await prisma.planFeature.upsert({
                where: {
                    planId_featureId: {
                        planId: dbPlan.id,
                        featureId: dbFeature.id
                    }
                },
                update: {
                    enabled: isEnabled,
                    limit: null
                },
                create: {
                    planId: dbPlan.id,
                    featureId: dbFeature.id,
                    enabled: isEnabled,
                    limit: null
                }
            });
            process.stdout.write('.');
        }
        console.log(`\nSynced features for ${planConfig.name}`);

        // Sync Limits
        for (const [limitKey, limitValue] of Object.entries(planConfig.limits)) {
            let dbFeature = await prisma.feature.findUnique({ where: { key: limitKey } });

            if (!dbFeature) {
                console.log(`Creating missing limit definition: ${limitKey}`);
                dbFeature = await prisma.feature.create({
                    data: {
                        key: limitKey,
                        category: 'system',
                        description: `Auto-created limit: ${limitKey}`,
                        defaultValue: false // limits are usually numbers, but feature table stores definitions
                    }
                });
            }

            let numericLimit: number | null = typeof limitValue === 'number' ? limitValue : null;
            if (numericLimit === -1) numericLimit = null; // -1 means unlimited in config, null in DB

            await prisma.planFeature.upsert({
                where: {
                    planId_featureId: {
                        planId: dbPlan.id,
                        featureId: dbFeature.id
                    }
                },
                update: {
                    enabled: true, // Limits are "enabled" features with a value
                    limit: numericLimit
                },
                create: {
                    planId: dbPlan.id,
                    featureId: dbFeature.id,
                    enabled: true,
                    limit: numericLimit
                }
            });
            process.stdout.write('.');
        }
        console.log(`\nSynced limits for ${planConfig.name}`);
    }

    console.log("\n✅ Plan Feature Sync Complete!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
