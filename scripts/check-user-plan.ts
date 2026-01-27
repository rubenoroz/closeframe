
import { prisma } from "../lib/db";

async function main() {
    console.log("🔍 Checking User Plan for rubenoroz@gmail.com...");

    const user = await prisma.user.findUnique({
        where: { email: "rubenoroz@gmail.com" },
        include: {
            plan: true,
            _count: { select: { cloudAccounts: true } }
        }
    });

    if (!user) {
        console.log("❌ User not found");
        return;
    }

    console.log(`User: ${user.email}`);
    console.log(`Clouds Connected: ${user._count.cloudAccounts}`);
    console.log(`Plan ID: ${user.planId}`);

    if (user.plan) {
        console.log("Plan Details:");
        console.log(`- Name: ${user.plan.name}`);
        console.log(`- Limits JSON: ${user.plan.limits}`);

        try {
            const limits = JSON.parse(user.plan.limits);
            console.log(`- Parsed Max Accounts: ${limits.maxCloudAccounts}`);
        } catch (e) {
            console.log("❌ Error parsing limits JSON");
        }
    } else {
        console.log("❌ User has NO plan attached (Defaults apply: max 1 cloud)");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
