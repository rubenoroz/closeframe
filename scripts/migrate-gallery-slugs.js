const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    const profiles = await prisma.userProfileV2.findMany();
    for (const profile of profiles) {
        if (!profile.content || !profile.content.projects) continue;

        let changed = false;
        const newContent = { ...profile.content };

        for (const project of newContent.projects) {
            if (project.galleryId && !project.gallerySlug) {
                const gallery = await prisma.project.findUnique({
                    where: { id: project.galleryId },
                    select: { slug: true }
                });
                if (gallery) {
                    project.gallerySlug = gallery.slug;
                    changed = true;
                    console.log(`Updated project "${project.title}" with slug "${gallery.slug}"`);
                }
            }
        }

        if (changed) {
            await prisma.userProfileV2.update({
                where: { id: profile.id },
                data: { content: newContent }
            });
        }
    }
    console.log("Migration finished.");
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
