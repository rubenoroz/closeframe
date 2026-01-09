import { prisma } from "../lib/db";

async function main() {
    await prisma.cloudAccount.deleteMany({});
    console.log("All cloud accounts deleted.");
}

main();
