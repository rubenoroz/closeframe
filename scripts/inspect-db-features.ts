
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Checking PlanFeatures in DB...");
    const plans = await prisma.plan.findMany({
        include: {
            planFeatures: {
                include: {
                    feature: true
                }
            }
        }
    });

    for (const plan of plans) {
        console.log(`\nPlan: ${plan.name} (${plan.id})`);
        const relevant = plan.planFeatures.filter(pf =>
            ['closerGalleries', 'collaborativeGalleries', 'zipDownloadsEnabled'].includes(pf.feature.key)
        );
        if (relevant.length === 0) {
            console.log("  No relevant features found.");
        }
        relevant.forEach(pf => {
            console.log(`  - ${pf.feature.key}: enabled=${pf.enabled}, limit=${pf.limit}`);
        });
    }
}

main().finally(() => prisma.$disconnect());
