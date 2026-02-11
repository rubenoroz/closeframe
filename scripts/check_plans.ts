
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const plans = await prisma.plan.findMany({
            orderBy: {
                sortOrder: 'asc',
            },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        console.log('--- Current Plans in Database ---');
        if (plans.length === 0) {
            console.log('No plans found in database.');
        } else {
            plans.forEach(plan => {
                console.log(`ID: ${plan.id}`);
                console.log(`Name: ${plan.name}`);
                console.log(`Display Name: ${plan.displayName}`);
                console.log(`Active: ${plan.isActive}`);
                console.log(`Users Count: ${plan._count.users}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error('Error fetching plans:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
