
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany();
    console.log("=== PLANS AND STRIPE PRICE IDS ===");
    plans.forEach(plan => {
        console.log(`Plan: ${plan.displayName} (${plan.name})`);
        console.log(`  MXN Monthly: ${plan.stripePriceIdMXNMonthly}`);
        console.log(`  MXN Yearly:  ${plan.stripePriceIdMXNYearly}`);
        console.log(`  USD Monthly: ${plan.stripePriceIdUSDMonthly}`);
        console.log(`  USD Yearly:  ${plan.stripePriceIdUSDYearly}`);
        console.log("-----------------------------------");
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
