
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- QR SECTIONS ---');
    const sections = await prisma.qrSection.findMany({
        include: {
            gallery: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    for (const s of sections) {
        console.log(`Section: ${s.name} (ID: ${s.id})`);
        console.log(`  Slug: ${s.slug}`);
        console.log(`  Drive Folder ID: ${s.driveFolderId}`);
        console.log(`  Gallery ID: ${s.gallery.id}`);
        console.log(`  Gallery Drive Folder ID: ${s.gallery.driveFolderId}`);
        console.log('---');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
