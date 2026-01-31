
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- PLANS ---');
    const plans = await prisma.plan.findMany();
    for (const p of plans) {
        console.log(`Plan: ${p.name} (ID: ${p.id})`);
        console.log(`Features (Legacy):`, p.features);
        console.log(`Limits (Legacy):`, p.limits);
        console.log(`Config (New):`, JSON.stringify(p.config, null, 2));
        console.log('---');
    }

    console.log('\n--- USERS WITH AGENCY PLAN ---');
    const agencyUsers = await prisma.user.findMany({
        where: {
            plan: {
                name: { contains: 'agency', mode: 'insensitive' }
            }
        },
        include: { plan: true },
        take: 5
    });

    for (const u of agencyUsers) {
        console.log(`User: ${u.email} (ID: ${u.id})`);
        console.log(`Plan Name in DB:`, u.plan?.name);
        console.log('---');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
