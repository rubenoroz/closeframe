const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PLANS = {
    FREE: {
        id: 'free',
        name: 'Free',
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
            videoGallery: false,
            displayPronouns: true
        }
    },
    PRO: {
        id: 'pro',
        name: 'Pro',
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
            videoGallery: false,
            displayPronouns: true
        }
    },
    STUDIO: {
        id: 'studio',
        name: 'Studio',
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
            videoGallery: true,
            displayPronouns: true
        }
    }
};

async function main() {
    console.log('Seeding Plan Configs...');

    for (const key of Object.keys(PLANS)) {
        const plan = PLANS[key];

        // Upsert plan just in case, but mostly update
        try {
            // First check if plan exists strictly by name
            const existing = await prisma.plan.findUnique({ where: { name: plan.id } });

            if (existing) {
                await prisma.plan.update({
                    where: { name: plan.id },
                    data: {
                        config: {
                            features: plan.features,
                            limits: plan.limits
                        }
                    }
                });
                console.log(`Updated config for ${plan.name}`);
            } else {
                console.log(`Creating Plan ${plan.name}...`);
                await prisma.plan.create({
                    data: {
                        name: plan.id,
                        displayName: plan.name,
                        features: "", // Legacy
                        limits: "", // Legacy
                        config: {
                            features: plan.features,
                            limits: plan.limits
                        },
                        price: 0, // Defaults
                        currency: 'USD',
                        interval: 'month'
                    }
                });
                console.log(`Created ${plan.name}`);
            }
        } catch (e) {
            console.error(`Error updating ${plan.name}:`, e);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
