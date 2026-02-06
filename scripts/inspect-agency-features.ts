
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Inspecting Agency Plan Features...");

    // 1. Find Agency Plan
    const agencyPlan = await prisma.plan.findFirst({
        where: { OR: [{ name: 'Agency' }, { name: 'agency' }] }
    });

    if (!agencyPlan) {
        console.error("❌ Agency plan not found!");
        return;
    }

    console.log(`Found Agency Plan: ${agencyPlan.name} (${agencyPlan.id})`);

    // 2. Find Features
    const featureKeys = ['lowResDownloads', 'highResDownloads', 'selectiveDownload'];

    for (const key of featureKeys) {
        const feature = await prisma.feature.findUnique({ where: { key } });
        if (!feature) {
            console.log(`❌ Feature '${key}' not found in Feature table.`);
            continue;
        }

        const pf = await prisma.planFeature.findUnique({
            where: {
                planId_featureId: {
                    planId: agencyPlan.id,
                    featureId: feature.id
                }
            }
        });

        if (!pf) {
            console.log(`❌ PlanFeature for '${key}' NOT FOUND for Agency.`);
        } else {
            console.log(`✅ ${key}: enabled=${pf.enabled}, limit=${pf.limit}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
