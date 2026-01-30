
import { prisma } from "../lib/db";

async function main() {
    try {
        const count = await prisma.externalVideo.count();
        console.log("ExternalVideo table exists. Count:", count);
    } catch (error: any) {
        if (error.code === 'P2021') {
            console.error("ERROR: The table 'ExternalVideo' does not exist in the database.");
        } else {
            console.error("Database connection error:", error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
