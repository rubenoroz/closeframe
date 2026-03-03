const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findFirst({
        where: { username: "rubenoroz" },
        include: { profileV2: true }
    });

    if (!user) {
        console.log("User not found");
        return;
    }

    console.log(`User: ${user.username}, ProfileV2 ID: ${user.profileV2?.id}`);
    if (user.profileV2?.data) {
        console.log("Data projects:", JSON.stringify(user.profileV2.data.projects, null, 2));
    } else {
        console.log("No profileV2 data found");
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
