
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { username: 'univa' },
        include: { profileV2: true }
    });
    console.log(JSON.stringify(user?.profileV2?.content, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
