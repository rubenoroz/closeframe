
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Auditing User <-> Plan Links...");

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            planId: true,
            role: true
        }
    });

    const plans = await prisma.plan.findMany();
    const planMap = new Map(plans.map(p => [p.id, p]));

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        if (!user.planId) {
            console.log(`⚠️ User ${user.email} (${user.role}) has NO planId.`);
            continue;
        }

        const plan = planMap.get(user.planId);
        if (!plan) {
            console.log(`❌ User ${user.email} has planId ${user.planId} which does NOT exist in Plans table.`);
        } else {
            console.log(`✅ User ${user.email} is on plan: ${plan.name} (${plan.id})`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
