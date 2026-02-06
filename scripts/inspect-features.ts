
import { prisma } from "../lib/db";

async function inspectFeatures() {
    try {
        console.log("Searching for features with 'duplicate' in key...");

        // Correct query based on schema (key, displayName, description?)
        // Checking schema first is safer, but 'key' is standard.
        const features = await prisma.feature.findMany({
            where: {
                key: { contains: "duplicate" }
            }
        });

        console.log(`Found ${features.length} features:`);
        console.log(JSON.stringify(features, null, 2));

    } catch (error) {
        console.error("Error inspecting features:", error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectFeatures();
