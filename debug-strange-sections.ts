
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SEARCHING FOR STRANGE SECTIONS ---');
    const sections = await prisma.qrSection.findMany({
        where: {
            name: {
                contains: 'Uploads'
            }
        },
        include: { gallery: { include: { project: true } } }
    });

    if (sections.length === 0) {
        console.log("No sections found containing 'Uploads' in the name.");
    }

    for (const s of sections) {
        console.log(`FOUND: "${s.name}" (Active: ${s.isActive})`);
        console.log(`  Project: ${s.gallery.project.name} (${s.gallery.project.slug})`);
    }

    console.log('--- ALL SECTIONS FOR PROJECT "Galería Colaborativa" ---');
    // Assuming the project name from previous log
    const project = await prisma.project.findFirst({ where: { name: 'Galería Colaborativa' }, include: { collaborativeGallery: { include: { sections: true } } } });
    if (project && project.collaborativeGallery) {
        project.collaborativeGallery.sections.forEach(s => {
            console.log(`- ${s.name} (Active: ${s.isActive})`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
