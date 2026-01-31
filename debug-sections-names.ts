
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- QR SECTIONS NAMES ---');
    const sections = await prisma.qrSection.findMany({
        include: {
            gallery: {
                include: {
                    project: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    for (const s of sections) {
        console.log(`Section Name: "${s.name}"`);
        console.log(`  Project: ${s.gallery.project.name}`);
        console.log(`  Slug: ${s.slug}`);
        console.log('---');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
