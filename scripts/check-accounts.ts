import { prisma } from "../lib/db";

async function main() {
    const users = await prisma.user.findMany({
        include: {
            cloudAccounts: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
}

main();
