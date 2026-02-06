
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany();
    console.log("Plans in DB:");
    plans.forEach(p => {
        console.log(`- ID: ${p.id}, Name: "${p.name}", Slug: "${p.slug || ''}"`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
