
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import { getFreshAuth } from '../lib/cloud/auth-factory';

const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Get a recent project with cloud account
        const project = await prisma.project.findFirst({
            include: {
                cloudAccount: true
            }
        });

        if (!project || !project.cloudAccountId) {
            console.log("No project found with cloud account.");
            return;
        }

        console.log(`Analyzing Project: ${project.name} (${project.id})`);
        console.log(`Cloud Account: ${project.cloudAccountId}`);

        const authClient = await getFreshAuth(project.cloudAccountId);
        const drive = google.drive({ version: 'v3', auth: authClient });

        console.log(`Listing files in root: ${project.rootFolderId}...`);
        const res = await drive.files.list({
            q: `'${project.rootFolderId}' in parents and mimeType contains 'video/' and trashed = false`,
            pageSize: 5,
            fields: 'files(id, name, mimeType, size)'
        });

        let targetVideo = res.data.files?.[0];

        if (!targetVideo) {
            console.log("No videos in root. Checking subfolders...");
            const resFolders = await drive.files.list({
                q: `'${project.rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name)'
            });

            // Prioritize 'Videos' or 'webmp4'
            const videoFolder = resFolders.data.files?.find(f =>
                f.name === 'Videos' || f.name === 'webmp4' || f.name === 'preview'
            );

            if (videoFolder) {
                console.log(`Checking folder: ${videoFolder.name} (${videoFolder.id})`);

                // List contents of Videos folder
                const resVideos = await drive.files.list({
                    q: `'${videoFolder.id}' in parents and trashed = false`,
                    fields: 'files(id, name, mimeType)'
                });

                console.log("Contents of Videos folder:", resVideos.data.files?.map(f => `${f.name} (${f.mimeType})`));

                // Check if any is a video
                targetVideo = resVideos.data.files?.find(f => f.mimeType?.includes('video/'));

                if (!targetVideo) {
                    // Check for subfolders like webmp4 or Alta
                    const subFolder = resVideos.data.files?.find(f => f.mimeType === 'application/vnd.google-apps.folder');
                    if (subFolder) {
                        console.log(`Checking subfolder: ${subFolder.name} (${subFolder.id})`);
                        const resSub = await drive.files.list({
                            q: `'${subFolder.id}' in parents and mimeType contains 'video/' and trashed = false`,
                            pageSize: 1,
                            fields: 'files(id, name, mimeType, size)'
                        });
                        targetVideo = resSub.data.files?.[0];
                    }
                }
            }
        }

        if (!targetVideo) {
            console.log("No videos found anywhere.");
            return;
        }

        console.log(`Found Video: ${targetVideo.name} (${targetVideo.id}) - ${targetVideo.mimeType}`);
        await testStream(drive, targetVideo);

    } catch (error) {
        console.error("General Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

async function testStream(drive: any, targetVideo: any) {
    console.log("\n--- Testing Stream Logic ---");
    try {
        const fileMeta = await drive.files.get({
            fileId: targetVideo.id!,
            fields: "size,mimeType,name"
        });
        console.log("Metadata Fetch: Success", fileMeta.data);

        const streamRes = await drive.files.get(
            { fileId: targetVideo.id!, alt: "media" },
            { responseType: "stream" }
        );
        console.log("Stream Open: Success (Status " + streamRes.status + ")");

    } catch (streamErr: any) {
        console.error("Stream Simulation Failed:", streamErr.message);
        if (streamErr.response) {
            console.error("Status:", streamErr.response.status);
            // console.error("Data:", streamErr.response.data);
        }
    }
}

main();
