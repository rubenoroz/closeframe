
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Robust Plan Merger...");

    const allPlans = await prisma.plan.findMany();
    const plansByName = new Map();

    for (const plan of allPlans) {
        const lower = plan.name.toLowerCase();
        if (!plansByName.has(lower)) {
            plansByName.set(lower, []);
        }
        plansByName.get(lower).push(plan);
    }

    for (const [name, duplicates] of plansByName.entries()) {
        if (duplicates.length > 1) {
            console.log(`Found ${duplicates.length} versions of plan: ${name}`);

            // Sort by createdAt (keep the oldest one as it likely has users)
            duplicates.sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());

            const [original, ...toDelete] = duplicates;
            console.log(`Keeping original: ${original.name} (${original.id}) - Created at: ${original.createdAt}`);

            for (const fake of toDelete) {
                console.log(`Deleting duplicate: ${fake.name} (${fake.id}) - Created at: ${fake.createdAt}`);

                // Move users to the original plan if any are pointing to the fake one
                const usersCount = await prisma.user.count({ where: { planId: fake.id } });
                if (usersCount > 0) {
                    console.log(`Moving ${usersCount} users to original plan...`);
                    await prisma.user.updateMany({
                        where: { planId: fake.id },
                        data: { planId: original.id }
                    });
                }

                // Delete the fake plan (Cascade will clean PlanFeatures for it)
                await prisma.plan.delete({ where: { id: fake.id } });
            }

            // Finally, ensure the original plan has the lowercase name for the new system
            await prisma.plan.update({
                where: { id: original.id },
                data: { name: name }
            });
            console.log(`Plan ${name} normalized.\n`);
        } else {
            // Just rename to lowercase if it wasn't already
            const p = duplicates[0];
            if (p.name !== name) {
                console.log(`Renaming ${p.name} to ${name}`);
                await prisma.plan.update({
                    where: { id: p.id },
                    data: { name: name }
                });
            }
        }
    }

    console.log("Merge complete.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
