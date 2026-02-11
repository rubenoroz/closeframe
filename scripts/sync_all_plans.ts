
import { prisma } from '../lib/db';

async function syncAllPlans() {
    console.log('--- Syncing All Plans (Config -> PlanFeature) ---');

    const plans = await prisma.plan.findMany();
    const allFeatures = await prisma.feature.findMany();
    const featureMap = new Map(allFeatures.map(f => [f.key, f.id]));

    for (const plan of plans) {
        console.log(`Processing plan: ${plan.name} (${plan.id})`);
        const config = plan.config as any;

        if (!config || (!config.features && !config.limits)) {
            console.log(`  - No config found, skipping.`);
            continue;
        }

        const upsertOperations = [];

        // 1. Sync Booleans (Features)
        if (config.features) {
            for (const [key, value] of Object.entries(config.features)) {
                const featureId = featureMap.get(key);
                if (featureId) {
                    upsertOperations.push(
                        prisma.planFeature.upsert({
                            where: { planId_featureId: { planId: plan.id, featureId } },
                            update: { enabled: value === true },
                            create: { planId: plan.id, featureId, enabled: value === true }
                        })
                    );
                } else {
                    console.warn(`  - Warning: Feature key '${key}' not found in Feature table.`);
                }
            }
        }

        // 2. Sync Limits (Numbers)
        if (config.limits) {
            for (const [key, value] of Object.entries(config.limits)) {
                const featureId = featureMap.get(key);
                if (featureId) {
                    const limitVal = typeof value === 'number' ? value : null;
                    upsertOperations.push(
                        prisma.planFeature.upsert({
                            where: { planId_featureId: { planId: plan.id, featureId } },
                            // Note: limits usually imply enabled=true if > 0, but strictly speaking we just enable it and set limit
                            update: { enabled: true, limit: limitVal },
                            create: { planId: plan.id, featureId, enabled: true, limit: limitVal }
                        })
                    );
                }
            }
        }

        if (upsertOperations.length > 0) {
            await prisma.$transaction(upsertOperations);
            console.log(`  - Synced ${upsertOperations.length} records.`);
        } else {
            console.log(`  - No features to sync.`);
        }
    }

    console.log('--- Sync Complete ---');
}

syncAllPlans()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
