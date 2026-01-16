import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = "rubenoroz@gmail.com";

    console.log(`Checking user with email: ${email}`);
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            accounts: true,
            plan: true,
        },
    });

    if (!user) {
        console.log("No user found with this email.");
    } else {
        console.log("User found:");
        console.log(JSON.stringify(user, null, 2));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
