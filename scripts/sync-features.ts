
import { PrismaClient } from '@prisma/client';
// Use relative path to avoid alias issues if possible, or assume tsx handles paths
import { FEATURE_POOL } from '../lib/features';

const prisma = new PrismaClient();

async function main() {
    console.log(`Starting Feature Sync... found ${FEATURE_POOL.length} features in code.`);

    for (const feat of FEATURE_POOL) {
        console.log(`Syncing: ${feat.id}`);

        await prisma.feature.upsert({
            where: { key: feat.id },
            update: {
                description: feat.description,
                category: feat.category,
                // We don't update key or id usually, but text fields can be updated
            },
            create: {
                key: feat.id,
                description: feat.description,
                category: feat.category,
                // Prisma schema expects Boolean for defaultValue
                defaultValue: typeof feat.defaultValue === 'boolean' ? feat.defaultValue : false
            }
        });
    }

    // New: Delete features that are no longer in the code definition
    const activeKeys = FEATURE_POOL.map(f => f.id);
    const deleteResult = await prisma.feature.deleteMany({
        where: {
            key: {
                notIn: activeKeys
            }
        }
    });

    console.log(`Deleted ${deleteResult.count} obsolete features.`);
    console.log("✅ Feature sync complete!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
