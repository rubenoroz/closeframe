
import { PrismaClient } from '@prisma/client';
import { GoogleDriveProvider } from './lib/cloud/google-drive-provider';
import { getFreshAuth } from './lib/cloud/auth-factory';

const prisma = new PrismaClient();
const driveProvider = new GoogleDriveProvider();

async function repairGallery(projectSlug: string) {
    console.log(`Starting repair for project: ${projectSlug}`);

    const project = await prisma.project.findUnique({
        where: { slug: projectSlug },
        include: {
            collaborativeGallery: {
                include: {
                    sections: true
                }
            },
            cloudAccount: true
        }
    });

    if (!project) {
        console.error("Project not found!");
        return;
    }

    if (!project.collaborativeGallery) {
        console.error("No collaborative gallery found for this project.");
        return;
    }

    console.log("Refreshing Access Token...");
    // Force refresh since we are running a script
    // We can use the provider's refresh if we have the refresh token
    const accessToken = await driveProvider.refreshAccessToken(project.cloudAccount.refreshToken || '');

    // 1. Re-create Root Folder
    console.log("Creating new Root Folder...");
    const rootFolderName = `📷 Uploads - ${project.name}`;
    const newRootId = await driveProvider.createFolder(project.rootFolderId, rootFolderName, accessToken);
    console.log(`New Root ID: ${newRootId}`);

    // Update DB
    await prisma.collaborativeGallery.update({
        where: { id: project.collaborativeGallery.id },
        data: { driveFolderId: newRootId }
    });

    // 2. Re-create Section Folders
    console.log(`Repairing ${project.collaborativeGallery.sections.length} sections...`);

    for (const section of project.collaborativeGallery.sections) {
        console.log(`Creating folder for: ${section.name}`);
        const folderName = `QR - ${section.name}`;
        const newSectionFolderId = await driveProvider.createFolder(newRootId, folderName, accessToken);

        await prisma.qrSection.update({
            where: { id: section.id },
            data: { driveFolderId: newSectionFolderId }
        });
        console.log(`  > Updated ID: ${newSectionFolderId}`);
    }

    console.log("\n✅ REPAIR COMPLETE!");
    console.log("Try uploading again. The new folders should appear in your Drive.");
}

// Replace 'tu-slug' with the actual slug if needed, or pass as arg
// For this user, we can try to auto-detect or just hardcode the slug from previous context if available.
// Logs showed: slug: "cml2..." or project names. 
// Let's grab the most recent updated project.

async function main() {
    // Find most recent project with collab gallery
    const project = await prisma.project.findFirst({
        where: {
            collaborativeGallery: {
                isNot: null
            }
        },
        orderBy: { updatedAt: 'desc' },
        select: { slug: true, name: true }
    });

    if (project) {
        await repairGallery(project.slug);
    } else {
        console.log("No active collaborative project found.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
