
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- FORCING FEATURE OVERRIDE ---');

    // 1. Get Project User
    const project = await prisma.project.findFirst({
        where: {
            collaborativeGallery: { isNot: null }
        },
        include: {
            user: true
        }
    });

    if (!project || !project.user) {
        console.log("No collaborative project found.");
        return;
    }

    const userId = project.user.id;
    console.log(`User: ${project.user.email} (${userId})`);

    const currentOverrides = (project.user.featureOverrides as any) || {};
    console.log("Current Overrides:", JSON.stringify(currentOverrides, null, 2));

    // 2. Update Feature Overrides
    const newOverrides = {
        ...currentOverrides,
        collaborativeGalleries: true // Force enable
    };

    await prisma.user.update({
        where: { id: userId },
        data: {
            featureOverrides: newOverrides
        }
    });

    console.log("✅ Updated Feature Overrides:", JSON.stringify(newOverrides, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
