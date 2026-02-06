
import { prisma } from "../lib/db";

async function removeDuplicateGalleryFeature() {
    try {
        console.log("Removing 'duplicateGallery' feature from database...");

        // Check if it exists
        const feature = await prisma.feature.findUnique({
            where: { key: "duplicateGallery" }
        });

        if (feature) {
            // Delete PlanFeature associations first (cascade might handle it, but being safe)
            await prisma.planFeature.deleteMany({
                where: { featureId: feature.id }
            });

            // Delete the Feature itself
            await prisma.feature.delete({
                where: { id: feature.id }
            });
            console.log("Successfully removed 'duplicateGallery' feature.");
        } else {
            console.log("'duplicateGallery' feature not found.");
        }

    } catch (error) {
        console.error("Error removing feature:", error);
    } finally {
        await prisma.$disconnect();
    }
}

removeDuplicateGalleryFeature();
