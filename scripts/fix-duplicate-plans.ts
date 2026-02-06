
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Plan Deduplication...");

    // The duplicates we identified (created recently, lowercase names, empty features)
    // We want to DELETE these: 'free', 'pro', 'studio', 'agency'
    // BUT KEEP 'family' (because it matched correctly)

    // We want to KEEP these (but rename to lowercase): 'Free', 'Pro', 'Studio', 'Agency'

    const targets = ['Free', 'Pro', 'Studio', 'Agency'];

    for (const properName of targets) {
        const lowerName = properName.toLowerCase();

        console.log(`Processing ${properName} -> ${lowerName}`);

        // 1. Find the "Real" plan (Capitalized)
        const realPlan = await prisma.plan.findUnique({
            where: { name: properName }
        });

        // 2. Find the "Fake" plan (Lowercase)
        const fakePlan = await prisma.plan.findUnique({
            where: { name: lowerName }
        });

        if (realPlan && fakePlan) {
            console.log(`Found duplicate for ${properName}. Deleting fake plan (${fakePlan.id}) and renaming real plan (${realPlan.id}).`);

            // Delete fake plan (Cascade will remove PlanFeatures)
            await prisma.plan.delete({
                where: { id: fakePlan.id }
            });

            // Rename real plan
            await prisma.plan.update({
                where: { id: realPlan.id },
                data: { name: lowerName }
            });
            console.log("Fixed.");
        } else if (realPlan && !fakePlan) {
            console.log(`Only found real plan ${properName}. Renaming to ${lowerName}.`);
            await prisma.plan.update({
                where: { id: realPlan.id },
                data: { name: lowerName }
            });
        } else if (!realPlan && fakePlan) {
            console.log(`Only found lowercase plan ${lowerName}. Keeping it.`);
        }
    }

    console.log("Deduplication complete.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
