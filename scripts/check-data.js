const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const profiles = await prisma.userProfileV2.findMany();
    for (const profile of profiles) {
        console.log(`Profile: ${profile.id}`);
        if (profile.data && profile.data.projects) {
            profile.data.projects.forEach(p => {
                console.log(` - Project: "${p.title}", galleryId: ${p.galleryId}, gallerySlug: ${p.gallerySlug}`);
            });
        }
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
