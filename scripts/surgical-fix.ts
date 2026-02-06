
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("FINAL SURGICAL PLAN FIX");

    // Mapping of Redundant Name -> Master Name
    const MAPPING = {
        'pro': 'plan-pro',
        'free': 'plan-free',
        'studio': 'plan-studio',
        'agency': 'plan-agency'
    };

    // 1. Get all plans to find their IDs
    const plans = await prisma.plan.findMany();

    for (const [redundantName, masterName] of Object.entries(MAPPING)) {
        const redundant = plans.find(p => p.name === redundantName);
        const master = plans.find(p => p.name === masterName);

        if (redundant && master) {
            console.log(`Merging ${redundantName} (${redundant.id}) -> ${masterName} (${master.id})`);

            // Move users
            const update = await prisma.user.updateMany({
                where: { planId: redundant.id },
                data: { planId: master.id }
            });
            console.log(`  Moved ${update.count} users.`);

            // Delete redundant
            await prisma.plan.delete({ where: { id: redundant.id } });
            console.log(`  Deleted redundant.`);

            // Rename master to clean name
            await prisma.plan.update({
                where: { id: master.id },
                data: { name: redundantName }
            });
            console.log(`  Renamed ${masterName} to ${redundantName}.`);
        }
    }

    console.log("\nFinal verification...");
    const final = await prisma.plan.findMany();
    final.forEach(p => console.log(`ID: ${p.id}, NAME: ${p.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
