
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

async function main() {
    const filename = process.argv[2] || 'DSC03901.JPG';
    console.log(`Searching for file: ${filename}...`);

    const accounts = await prisma.cloudAccount.findMany({
        where: { provider: 'google' }
    });

    if (accounts.length === 0) {
        console.log("No Google Cloud Accounts found.");
        return;
    }

    console.log(`Found ${accounts.length} Google accounts. Scanning...`);

    for (const account of accounts) {
        try {
            console.log(`Checking account: ${account.email} (${account.id})`);

            const auth = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );

            // Refresh token logic manual for script
            auth.setCredentials({ refresh_token: account.refreshToken });
            const { credentials } = await auth.refreshAccessToken();
            auth.setCredentials(credentials);

            const drive = google.drive({ version: 'v3', auth });

            const res = await drive.files.list({
                q: `name = '${filename}' and trashed = false`,
                fields: "files(id, name, mimeType, imageMediaMetadata, videoMediaMetadata, size, modifiedTime)",
            });

            const files = res.data.files;

            if (files && files.length > 0) {
                console.log(`\n!!! FOUND FILE IN ACCOUNT: ${account.email} !!!\n`);
                files.forEach(f => {
                    console.log("---------------------------------------------------");
                    console.log(`File: ${f.name} (ID: ${f.id})`);
                    console.log("MimeType:", f.mimeType);
                    console.log("ImageMetadata:", JSON.stringify(f.imageMediaMetadata, null, 2));
                    console.log("VideoMetadata:", JSON.stringify(f.videoMediaMetadata, null, 2));
                    console.log("---------------------------------------------------");
                });
                // We typically stop after finding, but let's check all just in case duplicates exist
            } else {
                console.log(`Not found in ${account.email}`);
            }

        } catch (error: any) {
            console.error(`Failed to check account ${account.email}:`, error.message);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
