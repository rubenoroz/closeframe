
import { PrismaClient } from '@prisma/client';
import { getEffectivePlanConfig } from './lib/plans.config';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSING CONFIG ---');

    // 1. Get Project
    const project = await prisma.project.findFirst({
        where: {
            collaborativeGallery: { isNot: null }
        },
        include: {
            user: { include: { plan: true } },
            collaborativeGallery: true
        }
    });

    if (!project) {
        console.log("No collaborative project found.");
        return;
    }

    console.log(`Project: ${project.name}`);
    console.log(`Plan Name: ${project.user.plan?.name}`);
    console.log(`CollaborativeGallery ID: ${project.collaborativeGallery?.id}`);
    console.log(`CollaborativeGallery Active: ${project.collaborativeGallery?.isActive}`);

    // 2. Check Effective Config
    const config = getEffectivePlanConfig(
        project.user.plan?.config || project.user.plan?.name,
        project.user.featureOverrides
    );

    console.log(`Feature 'collaborativeGalleries': ${config.features?.collaborativeGalleries}`);

    // 3. Check Sections count
    const sections = await prisma.qrSection.findMany({
        where: {
            gallery: { id: project.collaborativeGallery!.id },
            isActive: true
        }
    });
    console.log(`Active Sections Count: ${sections.length}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
