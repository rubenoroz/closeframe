
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking recent project memberships...");
        const members = await prisma.projectMember.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { email: true, id: true } },
                project: { select: { name: true, ownerId: true } }
            }
        });

        console.log("Found members:", JSON.stringify(members, null, 2));

        if (members.length > 0) {
            const userId = members[0].userId;
            console.log(`Testing query for userId: ${userId}`);

            const projects = await prisma.scenaProject.findMany({
                where: {
                    OR: [
                        { ownerId: userId },
                        { members: { some: { userId: userId } } }
                    ]
                },
                select: { id: true, name: true }
            });
            console.log("Projects found for user:", projects);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
