
import { prisma } from "../lib/db";

async function main() {
    console.log("🔍 Checking Dropbox Accounts...");

    const accounts = await prisma.cloudAccount.findMany({
        where: { provider: "dropbox" },
        include: { user: true }
    });

    if (accounts.length === 0) {
        console.log("❌ No Dropbox accounts found in database.");
    } else {
        console.log(`✅ Found ${accounts.length} Dropbox account(s):`);
        accounts.forEach(acc => {
            console.log(`- ID: ${acc.id}`);
            console.log(`  User: ${acc.user.email} (${acc.userId})`);
            console.log(`  Dropbox Email: ${acc.email}`);
            console.log(`  Expires At: ${acc.expiresAt}`);
            console.log(`  Created At: ${acc.createdAt}`);
        });
    }

    const users = await prisma.user.findMany({
        include: {
            _count: { select: { cloudAccounts: true } }
        }
    });
    console.log("\n👥 Users and Cloud Counts:");
    users.forEach(u => {
        console.log(`- ${u.email}: ${u._count.cloudAccounts} clouds`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
