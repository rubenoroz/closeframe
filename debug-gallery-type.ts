
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- CHECKING GALLERY TYPE ---');
    const project = await prisma.project.findFirst({
        where: {
            collaborativeGallery: { isNot: null }
        },
        orderBy: { updatedAt: 'desc' },
        select: {
            name: true,
            slug: true,
            isCloserGallery: true,
            collaborativeGallery: {
                select: { sections: true }
            }
        }
    });

    if (project) {
        console.log(`Project: ${project.name}`);
        console.log(`Slug: ${project.slug}`);
        console.log(`isCloserGallery: ${project.isCloserGallery}`);
        console.log(`Collaborative Sections: ${project.collaborativeGallery?.sections.length}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
