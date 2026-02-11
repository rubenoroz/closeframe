
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Defined in lib/features.ts (Manual extraction to valid dependencies issues)
const UI_FEATURES = [
    "publicProfile", "professionalProfile", "bioMaxLength", "coverImage", "callToAction",
    "customFields", "maxSocialLinks", "advancedSocialNetworks", "displayPronouns",
    "hideBranding", "whiteLabel", "customDomain", "customUrl", "manualOrdering",
    "maxImagesPerProject", "videoGallery", "embeddedVideos", "videoCover", "galleryCover",
    "passwordProtection", "privateLinks", "temporaryLinks", "expirationDate", "emailAccess",
    "lowResDownloads", "lowResThumbnails", "highResDownloads", "selectiveDownload",
    "zipDownloadsEnabled", "simulatedWatermark", "customWatermark", "rightClickProtection",
    "themeToggle", "baseThemes", "customFonts", "customLogo",
    "smoothTransitions", "premiumAnimations", "storytelling", "editorialDescription",
    "viewOnlyGalleries", "qrCode", "duplicateGallery", "collections",
    "maxProjects", "maxCloudAccounts", "prioritySupport", "humanSupport", "duplicateDetection",
    "seoNoIndex", "seoControl", "assistMigration", "gdprCompliance", "basicInsights",
    "advancedInsights", "galleryAnalytics", "imageAnalytics", "downloadAnalytics",
    "geoAnalytics", "linkTracking", "exportAnalytics", "teams", "roles", "guestCollaborators",
    "privateComments", "imageComments", "visualFeedback", "approvals", "versioning",
    "changeHistory", "sharedGalleries", "scenaAccess", "maxScenaProjects", "imageSelection",
    "stripeIntegration", "paypalIntegration", "customStripePayments", "coupons",
    "bookingConfig", "bookingWindow", "bookingPayments", "castingPayments", "contracts",
    "store", "closerGalleries", "collaborativeGalleries", "calendarSync"
];

// Features found in legacy config but missing in UI
const LEGACY_SUSPECTS = [
    "listView", "musicGallery", "externalVideoAuth", "closerGallery"
];

async function main() {
    console.log("--- Verifying Matrix Integrity ---");

    const dbFeatures = await prisma.feature.findMany();
    const dbKeys = new Set(dbFeatures.map(f => f.key));
    const plans = await prisma.plan.findMany();

    console.log(`\n1. Checking UI Features against DB (${UI_FEATURES.length} items):`);
    const missingInDb: string[] = [];

    for (const key of UI_FEATURES) {
        if (!dbKeys.has(key)) {
            missingInDb.push(key);
        }
    }

    if (missingInDb.length > 0) {
        console.log("❌ CRITICAL: The following features are in UI but MISSING in DB:");
        missingInDb.forEach(k => console.log(`   - ${k}`));
    } else {
        console.log("✅ All UI features exist in DB.");
    }

    console.log(`\n2. Checking Plan Associations for UI Features:`);
    let orphanCount = 0;
    for (const key of UI_FEATURES) {
        if (missingInDb.includes(key)) continue;

        const feature = dbFeatures.find(f => f.key === key)!;
        const planFeatures = await prisma.planFeature.count({
            where: { featureId: feature.id }
        });

        if (planFeatures !== plans.length) {
            console.log(`⚠️  Warning: Feature '${key}' has ${planFeatures} plan links (Expected ${plans.length})`);
            orphanCount++;
        }
    }
    if (orphanCount === 0) console.log("✅ All UI features are linked to all plans.");


    console.log(`\n3. Checking Legacy Suspects:`);
    for (const key of LEGACY_SUSPECTS) {
        if (dbKeys.has(key)) {
            console.log(`ℹ️  Legacy feature '${key}' EXISTS in DB (but likely missing from UI matrix).`);
        } else {
            console.log(`Runs: Legacy feature '${key}' does NOT exist in DB.`);
        }
    }

    console.log("\nDone.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
