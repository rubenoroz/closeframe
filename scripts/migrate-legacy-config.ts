
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Migration from Plan.config to PlanFeature table...");

    const plans = await prisma.plan.findMany();

    for (const plan of plans) {
        if (!plan.config || typeof plan.config !== 'object') {
            console.log(`Skipping plan ${plan.name} (no config)`);
            continue;
        }

        const config = plan.config as any;
        const features = config.features || {};
        const limits = config.limits || {};

        console.log(`Migrating config for plan: ${plan.name}`);

        // Sync Features
        for (const [key, value] of Object.entries(features)) {
            const feature = await prisma.feature.findUnique({ where: { key } });
            if (!feature) {
                console.log(`Creating missing feature key: ${key}`);
                const newFeature = await prisma.feature.create({
                    data: {
                        key,
                        category: key.toLowerCase().includes('scena') ? 'scena' : 'system',
                        description: `Legacy feature: ${key}`,
                        defaultValue: false
                    }
                });

                await prisma.planFeature.upsert({
                    where: { planId_featureId: { planId: plan.id, featureId: newFeature.id } },
                    update: { enabled: !!value, limit: null },
                    create: { planId: plan.id, featureId: newFeature.id, enabled: !!value, limit: null }
                });
                continue;
            }

            await prisma.planFeature.upsert({
                where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
                update: { enabled: !!value, limit: null },
                create: { planId: plan.id, featureId: feature.id, enabled: !!value, limit: null }
            });
        }

        // Sync Limits
        for (const [key, value] of Object.entries(limits)) {
            const feature = await prisma.feature.findUnique({ where: { key } });
            if (!feature) {
                console.log(`Creating missing limit key: ${key}`);
                const newFeature = await prisma.feature.create({
                    data: {
                        key,
                        category: key.toLowerCase().includes('scena') ? 'scena' : 'system',
                        description: `Legacy limit: ${key}`,
                        defaultValue: false
                    }
                });

                let limitVal = typeof value === 'number' ? value : null;
                if (limitVal === -1) limitVal = null;

                await prisma.planFeature.upsert({
                    where: { planId_featureId: { planId: plan.id, featureId: newFeature.id } },
                    update: { enabled: true, limit: limitVal },
                    create: { planId: plan.id, featureId: newFeature.id, enabled: true, limit: limitVal }
                });
                continue;
            }

            let limitVal = typeof value === 'number' ? value : null;
            if (limitVal === -1) limitVal = null;

            await prisma.planFeature.upsert({
                where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
                update: { enabled: true, limit: limitVal },
                create: { planId: plan.id, featureId: feature.id, enabled: true, limit: limitVal }
            });
        }
    }

    console.log("Migration complete.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
