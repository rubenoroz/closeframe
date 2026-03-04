import { prisma } from "../lib/db";
import { getFreshAuth } from "../lib/cloud/auth-factory";
import { MicrosoftGraphProvider } from "../lib/cloud/microsoft-provider";

async function debugOneDrive() {
    console.log("--- OneDrive Debug Start ---");

    // 1. Find a Microsoft account
    const account = await prisma.cloudAccount.findFirst({
        where: { provider: "microsoft" }
    });

    if (!account) {
        console.log("No Microsoft account found in DB.");
        return;
    }

    console.log(`Found account: ${account.email} (ID: ${account.id})`);
    console.log(`Expires At: ${account.expiresAt}`);

    try {
        // 2. Test getFreshAuth
        console.log("Testing getFreshAuth...");
        const token = await getFreshAuth(account.id);
        console.log("Token obtained successfully (first 10 chars):", String(token).substring(0, 10));

        // 3. Test Provider
        const provider = new MicrosoftGraphProvider(token as string);

        console.log("Testing listFolders (root)...");
        const folders = await provider.listFolders("root");
        console.log(`Found ${folders.length} root folders.`);
        if (folders.length > 0) {
            console.log("First folder:", folders[0].name, "(ID:", folders[0].id, ")");
        }

        // 4. Find a project for this account
        const project = await prisma.project.findFirst({
            where: { cloudAccountId: account.id }
        });

        if (project) {
            console.log(`Testing listFiles for project: ${project.name} (Folder: ${project.rootFolderId})`);

            // Debug the raw response from Graph
            const rawUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${project.rootFolderId}/children`;
            const rawRes = await fetch(rawUrl, { headers: { Authorization: `Bearer ${token}` } });
            const rawData = await rawRes.json();
            console.log(`Raw children count in root: ${rawData.value?.length || 0}`);
            if (rawData.value) {
                rawData.value.forEach((item: any) => {
                    console.log(`  - ${item.name} (${item.folder ? 'FOLDER' : 'FILE'}) - ID: ${item.id}`);
                });
            }

            const files = await provider.listFiles(project.rootFolderId);
            console.log(`Found ${files.length} media files in project root via provider.`);

            console.log("Testing listFolders on project root...");
            const subfolders = await provider.listFolders(project.rootFolderId);
            console.log(`Found ${subfolders.length} subfolders.`);
            for (const sub of subfolders) {
                console.log(`  Scanning subfolder: ${sub.name}...`);
                const subFiles = await provider.listFiles(sub.id);
                console.log(`    Found ${subFiles.length} files.`);
            }

            if (files.length > 0) {
                console.log("First file:", files[0].name, "(Mime:", files[0].mimeType, ")");
                console.log("Thumbnail Link:", files[0].thumbnailLink ? "YES" : "NO");

                if (files[0].id) {
                    console.log("Testing getThumbnail specifically...");
                    const thumb = await provider.getThumbnail(files[0].id);
                    console.log("Thumbnail URL retrieved:", thumb ? "YES" : "NO");
                }
            }
        } else {
            console.log("No projects found for this Microsoft account.");
        }

    } catch (err: any) {
        console.error("DEBUG ERROR:", err.message);
        if (err.stack) console.error(err.stack);
    }

    console.log("--- OneDrive Debug End ---");
}

debugOneDrive().catch(console.error);
