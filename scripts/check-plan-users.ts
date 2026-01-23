
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany({
        include: {
            _count: {
                select: { users: true }
            }
        }
    });

    const formatted = plans.map(p => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        userCount: p._count.users
    }));

    console.log(JSON.stringify(formatted, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
