
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany();
    console.log("=== PLAN FEATURES (DISPLAY LIST) ===");
    plans.forEach(plan => {
        console.log(`Plan: ${plan.displayName} (${plan.name})`);
        console.log(`  Features (JSON string): ${plan.features}`);
        console.log("-----------------------------------");
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
