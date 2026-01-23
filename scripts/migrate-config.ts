import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS_DATA = {
    FREE: {
        limits: {
            bioMaxLength: 150,
            maxSocialLinks: 1,
            bookingWindow: 0,
            maxProjects: 3,
            maxCloudAccounts: 1,
        },
        features: {
            advancedSocialNetworks: false,
            callToAction: false,
            hideBranding: false,
            manualOrdering: false,
            listView: false,
            bookingConfig: false,
            displayPronouns: true,
            coverImage: false,
            videoGallery: false,
        }
    },
    PRO: {
        limits: {
            bioMaxLength: 500,
            maxSocialLinks: -1,
            bookingWindow: 4,
            maxProjects: 100,
            maxCloudAccounts: 2,
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
            displayPronouns: true,
            coverImage: true,
            videoGallery: true,
        }
    },
    STUDIO: {
        limits: {
            bioMaxLength: 1000,
            maxSocialLinks: -1,
            bookingWindow: 0,
            maxProjects: -1,
            maxCloudAccounts: -1,
        },
        features: {
            advancedSocialNetworks: true,
            callToAction: true,
            hideBranding: true,
            manualOrdering: true,
            listView: true,
            bookingConfig: true,
            displayPronouns: true,
            coverImage: true,
            videoGallery: true,
        }
    }
};

async function main() {
    console.log("Starting migration (Case Insensitive)...");

    // Update Free
    const r1 = await prisma.plan.updateMany({
        where: { name: 'plan-free' },
        data: { config: PLANS_DATA.FREE }
    });
    console.log(`Updated plan-free: ${r1.count} records`);

    // Update Pro
    const r2 = await prisma.plan.updateMany({
        where: { name: 'plan-pro' },
        data: { config: PLANS_DATA.PRO }
    });
    console.log(`Updated plan-pro: ${r2.count} records`);

    // Update Studio
    const r3 = await prisma.plan.updateMany({
        where: { name: 'plan-studio' },
        data: { config: PLANS_DATA.STUDIO }
    });
    console.log(`Updated plan-studio: ${r3.count} records`);

    // Update Agency (give it Studio defaults + extra if needed, or just Studio for now)
    const r4 = await prisma.plan.updateMany({
        where: { name: 'plan-agency' },
        data: { config: PLANS_DATA.STUDIO }
    });
    console.log(`Updated plan-agency: ${r4.count} records`);

    console.log("Migration complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
