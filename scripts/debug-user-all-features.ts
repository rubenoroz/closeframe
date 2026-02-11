import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userEmail = 'rubenoroz@gmail.com';
    const user = await (prisma.user as any).findUnique({
        where: { email: userEmail },
        include: { plan: true }
    });

    if (!user) {
        console.log(`User ${userEmail} not found`);
        return;
    }

    console.log(`User: ${user.email} (Role: ${user.role}, Plan: ${user.plan?.name || 'none'})`);
    console.log(`User Feature Overrides:`, (user as any).featureOverrides);

    const planId = user.planId;

    // Fetch all features
    const allFeatures = await prisma.feature.findMany({
        orderBy: { key: 'asc' }
    });

    // Fetch all plan features for this plan
    const planFeatures = planId ? await prisma.planFeature.findMany({
        where: { planId }
    }) : [];

    const planFeaturesMap = new Map();
    // Pre-fetch feature objects to map ID to Key if needed, 
    // but better, we just iterate through allFeatures and find matches
    planFeatures.forEach(pf => planFeaturesMap.set(pf.featureId, pf));

    console.log('\n--- Feature Matrix ---');
    console.log('Feature Key'.padEnd(30), '| Default | Plan Value | Override | Effective');
    console.log('-'.repeat(80));

    for (const f of allFeatures) {
        const pf = planFeaturesMap.get(f.id);
        const overrides = (user as any).featureOverrides;
        const override = overrides && typeof overrides === 'object' ? (overrides as any)[f.key] : undefined;

        let planValue = pf ? (pf.enabled ? 'true' : 'false') : 'N/A';
        if (pf && pf.limit !== null) planValue = `limit:${pf.limit}`;

        let overrideValue = override !== undefined ? (typeof override === 'boolean' ? (override ? 'true' : 'false') : `limit:${override}`) : 'N/A';

        // Effective logic (Simplified matching lib/features/service.ts)
        let effective = f.defaultValue ? 'true' : 'false';
        if (pf) effective = pf.enabled ? 'true' : 'false';
        // Overrides ALWAYS win
        if (override !== undefined) effective = override ? (typeof override === 'boolean' ? 'true' : `limit:${override}`) : 'false';

        console.log(
            f.key.padEnd(30),
            `| ${f.defaultValue ? 'true ' : 'false'}`,
            `| ${planValue.padEnd(10)}`,
            `| ${overrideValue.padEnd(8)}`,
            `| ${effective}`
        );
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
