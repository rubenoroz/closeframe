import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany({ select: { id: true, name: true } });
    plans.forEach(p => console.log(`Plan Name: '${p.name}' (ID: ${p.id})`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
