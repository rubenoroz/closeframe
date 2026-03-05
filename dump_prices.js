
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany();
    console.log("=== PLANS AND STRIPE PRICE IDS ===");
    plans.forEach(plan => {
        console.log(`Plan: ${plan.displayName} (${plan.name})`);
        console.log(`  Price MXN (Yearly): ${plan.priceMXN}`);
        console.log(`  Price USD (Yearly): ${plan.priceUSD}`);
        console.log(`  Monthly MXN: ${plan.monthlyPriceMXN}`);
        console.log(`  Monthly USD: ${plan.monthlyPriceUSD}`);
        console.log(`  MXN Monthly ID: ${plan.stripePriceIdMXNMonthly}`);
        console.log(`  MXN Yearly ID:  ${plan.stripePriceIdMXNYearly}`);
        console.log(`  USD Monthly ID: ${plan.stripePriceIdUSDMonthly}`);
        console.log(`  USD Yearly ID:  ${plan.stripePriceIdUSDYearly}`);
        console.log("-----------------------------------");
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
