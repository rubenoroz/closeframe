
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Checking Agency Plan Limits ---");

    // 1. Find Agency Plan
    const agencyPlan = await prisma.plan.findFirst({
        where: { name: 'agency' },
        include: { planFeatures: { include: { feature: true } } }
    });

    if (!agencyPlan) {
        console.log("❌ Agency plan not found");
        return;
    }

    console.log(`Plan: ${agencyPlan.displayName} (${agencyPlan.name})`);

    // 2. Check all features
    console.log("Features:");
    agencyPlan.planFeatures.forEach(pf => {
        console.log(` - ${pf.feature.key}: enabled=${pf.enabled}, limit=${pf.limit}`);
    });

    // 3. specific check for scenaProjects
    const projectLimit = agencyPlan.planFeatures.find(pf => pf.feature.key === 'scenaProjects');
    if (projectLimit) {
        console.log(`\n✅ 'scenaProjects' found: limit=${projectLimit.limit} (-1 means unlimited)`);
    } else {
        console.error("\n❌ 'scenaProjects' feature NOT found for Agency plan!");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
