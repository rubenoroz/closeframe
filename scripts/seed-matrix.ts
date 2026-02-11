import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MATRIX = {
    FREE: {
        features: {
            publicProfile: true,
            displayPronouns: true,
            lowResDownloads: true,
            selectiveDownload: true,
            simulatedWatermark: true,
            themeToggle: true,
            // Disabled
            professionalProfile: false,
            hideBranding: false,
            callToAction: false,
            customFields: false,
            advancedSocialNetworks: false,
            whiteLabel: false,
            customDomain: false,
            customUrl: false,
            manualOrdering: false,
            videoGallery: false,
            embeddedVideos: false,
            videoCover: false,
            passwordProtection: false,
            privateLinks: false,
            temporaryLinks: false,
            expirationDate: false,
            emailAccess: false,
            highResDownloads: false,
            zipDownloadsEnabled: false,
            customWatermark: false,
            rightClickProtection: false,
            baseThemes: false,
            customFonts: false,
            customLogo: false,
            smoothTransitions: false,
            premiumAnimations: false,
            storytelling: false,
            editorialDescription: false,
            viewOnlyGalleries: false,
            qrCode: false,
            duplicateGallery: false,
            collections: false,
            prioritySupport: false,
            humanSupport: false,
            duplicateDetection: false,
            seoNoIndex: false,
            seoControl: false,
            assistMigration: false,
            gdprCompliance: false,
            basicInsights: false,
            advancedInsights: false,
            galleryAnalytics: false,
            imageAnalytics: false,
            downloadAnalytics: false,
            geoAnalytics: false,
            linkTracking: false,
            exportAnalytics: false,
            teams: false,
            roles: false,
            guestCollaborators: false,
            privateComments: false,
            imageComments: false,
            visualFeedback: false,
            approvals: false,
            versioning: false,
            changeHistory: false,
            sharedGalleries: false,
            imageSelection: false,
            stripeIntegration: false,
            paypalIntegration: false,
            customStripePayments: false,
            coupons: false,
            bookingConfig: false,
            bookingPayments: false,
            castingPayments: false,
            contracts: false,
            store: false
        },
        limits: {
            bioMaxLength: 150,
            maxSocialLinks: 1,
            maxProjects: 1,
            maxImagesPerProject: 20,
            maxCloudAccounts: 1,
            bookingWindow: 0
        }
    },
    PRO: {
        features: {
            publicProfile: true, // Inherits basic?
            professionalProfile: true,
            displayPronouns: true,
            lowResDownloads: true,
            selectiveDownload: true,
            simulatedWatermark: true,
            themeToggle: true,
            hideBranding: true,
            callToAction: true,
            customFields: true,
            advancedSocialNetworks: true, // "Bio extendida" implied
            coverImage: true,
            viewOnlyGalleries: true,
            editorialDescription: true,
            duplicateGallery: true,
            passwordProtection: true,
            privateLinks: true, // "Galerías privadas"
            highResDownloads: true,
            customWatermark: true,
            customFonts: true,
            smoothTransitions: true,
            duplicateDetection: true,
            videoGallery: true, // "Soporte de pestaña video"
            lowResThumbnails: true, // "Thumbnails de calidad baja" (Seems standard?)
            // Disabled
            whiteLabel: false,
            customDomain: false,
            customUrl: false,

            embeddedVideos: false,
            videoCover: false,
            temporaryLinks: false,
            expirationDate: false,
            emailAccess: false,
            zipDownloadsEnabled: false,
            rightClickProtection: false,
            baseThemes: false, // "Temas base" is Studio
            customLogo: false,
            premiumAnimations: false,
            storytelling: false,
            qrCode: false,
            collections: false,
            prioritySupport: false, // "Soporte estándar" listed in Pro, Priority in Studio
            humanSupport: false,
            seoNoIndex: false,
            seoControl: false,
            assistMigration: false,
            gdprCompliance: false,
            basicInsights: false, // Studio?
            advancedInsights: false,
            galleryAnalytics: false,
            imageAnalytics: false,
            downloadAnalytics: false,
            geoAnalytics: false,
            linkTracking: false,
            exportAnalytics: false,
            teams: false,
            roles: false,
            guestCollaborators: false,
            privateComments: false,
            imageComments: false,
            visualFeedback: false,
            approvals: false,
            versioning: false,
            changeHistory: false,
            sharedGalleries: false,
            imageSelection: false,
            stripeIntegration: false,
            paypalIntegration: false,
            customStripePayments: false,
            coupons: false,
            bookingConfig: false,
            bookingPayments: false,
            castingPayments: false,
            contracts: false,
            store: false
        },
        limits: {
            bioMaxLength: 500, // Bio extendida
            maxSocialLinks: -1,
            maxProjects: 100,
            maxImagesPerProject: -1, // Unlimited
            maxCloudAccounts: 2,
            bookingWindow: 4
        }
    },
    STUDIO: {
        features: {
            // Includes Pro features
            publicProfile: true,
            professionalProfile: true,
            displayPronouns: true,
            lowResDownloads: true,
            selectiveDownload: true,
            simulatedWatermark: true,
            themeToggle: true,
            hideBranding: true,
            callToAction: true,
            customFields: true,
            advancedSocialNetworks: true,
            coverImage: true,
            viewOnlyGalleries: true,
            editorialDescription: true,
            duplicateGallery: true,
            passwordProtection: true,
            privateLinks: true,
            highResDownloads: true,
            customWatermark: true,
            customFonts: true,
            smoothTransitions: true,
            duplicateDetection: true,
            videoGallery: true,

            // Studio Exclusives
            whiteLabel: true,
            customUrl: true, // closerlens.com/usuario
            store: true, // "Galerías descargables" (Paid?)
            manualOrdering: true,
            storytelling: true,
            collections: true,
            expirationDate: true,
            rightClickProtection: true,
            seoNoIndex: true,
            embeddedVideos: true,
            videoCover: true,
            baseThemes: true,
            customLogo: true, // "Logo propio"
            premiumAnimations: true,
            temporaryLinks: true,
            galleryAnalytics: true,
            imageAnalytics: true,
            downloadAnalytics: true,
            linkTracking: true,
            basicInsights: true,
            // multipleProfiles: true, // Not in features.ts yet?
            stripeIntegration: true,
            paypalIntegration: true,
            coupons: true,
            contracts: true,
            castingPayments: true,
            bookingPayments: true,
            // downloadProtection: true,
            // seoControl: true,
            // revokeLinks: true,
            prioritySupport: true,
            // hideUI: true,
            // advancedLayouts: true,
            // highResThumbnails: true
        },
        limits: {
            bioMaxLength: 1000,
            maxSocialLinks: -1,
            maxProjects: -1, // Ilimitadas
            maxImagesPerProject: -1,
            maxCloudAccounts: 5,
            bookingWindow: 0
        }
    },
    AGENCY: {
        features: {
            // Includes Studio features
            publicProfile: true,
            professionalProfile: true,
            displayPronouns: true,
            lowResDownloads: true,
            selectiveDownload: true,
            simulatedWatermark: true,
            themeToggle: true,
            hideBranding: true,
            callToAction: true,
            customFields: true,
            advancedSocialNetworks: true,
            coverImage: true,
            viewOnlyGalleries: true,
            editorialDescription: true,
            duplicateGallery: true,
            passwordProtection: true,
            privateLinks: true,
            highResDownloads: true,
            customWatermark: true,
            customFonts: true,
            smoothTransitions: true,
            duplicateDetection: true,
            videoGallery: true,
            whiteLabel: true,
            customUrl: true,
            store: true,
            manualOrdering: true,
            storytelling: true,
            collections: true,
            expirationDate: true,
            rightClickProtection: true,
            seoNoIndex: true,
            embeddedVideos: true,
            videoCover: true,
            baseThemes: true,
            customLogo: true,
            premiumAnimations: true,
            temporaryLinks: true,
            galleryAnalytics: true,
            imageAnalytics: true,
            downloadAnalytics: true,
            linkTracking: true,
            basicInsights: true,
            stripeIntegration: true,
            paypalIntegration: true,
            coupons: true,
            contracts: true,
            castingPayments: true,
            bookingPayments: true,
            prioritySupport: true,

            // Agency Exclusives
            customDomain: true,
            // projectGalleries: true, // Implied
            imageSelection: true,
            // projectDescription: true,
            // metadataFields: true, // Rol: Foto/Cliente/etc
            emailAccess: true,
            qrCode: true,
            geoAnalytics: true,
            exportAnalytics: true,
            advancedInsights: true,
            teams: true,
            roles: true,
            guestCollaborators: true,
            privateComments: true,
            imageComments: true,
            visualFeedback: true,
            approvals: true,
            versioning: true,
            changeHistory: true,
            sharedGalleries: true,
            humanSupport: true,
            // privateCommunity: true,
            gdprCompliance: true,
            assistMigration: true,
            customStripePayments: true
        },
        limits: {
            bioMaxLength: 2000,
            maxSocialLinks: -1,
            maxProjects: -1,
            maxImagesPerProject: -1,
            maxCloudAccounts: -1, // Ilimitado
            bookingWindow: 0
        }
    }
};

async function main() {
    console.log("Seeding Full Matrix...");

    // Free
    await prisma.plan.updateMany({
        where: { name: 'plan-free' },
        data: { config: MATRIX.FREE }
    });

    // Pro
    await prisma.plan.updateMany({
        where: { name: 'plan-pro' },
        data: { config: MATRIX.PRO }
    });

    // Studio
    await prisma.plan.updateMany({
        where: { name: 'plan-studio' },
        data: { config: MATRIX.STUDIO }
    });

    // Agency
    await prisma.plan.updateMany({
        where: { name: 'plan-agency' },
        data: { config: MATRIX.AGENCY }
    });

    console.log("Matrix Seeded.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
