
import { prisma } from './lib/db';
import { getEffectiveFeatures } from './lib/features/service';

async function debugStudioAccess() {
    console.log('--- Debugging Studio Access for closerGalleries ---');

    // Studio Plan ID from previous output
    const planId = 'cmkh7mys20002v96qtvk9nuyw';
    const plan = await prisma.plan.findUnique({ where: { id: planId } });

    if (!plan) {
        console.error('Studio Plan not found!');
        return;
    }

    console.log(`Plan: ${plan.displayName} (${plan.name})`);

    // Create a temporary user on this plan
    const user = await prisma.user.create({
        data: {
            email: `debug_studio_${Date.now()}@test.com`,
            name: 'Debug Studio User',
            planId: plan.id,
            role: 'USER'
        }
    });

    console.log(`User created: ${user.email} (${user.id})`);

    // 1. Check Feature Access
    const features = await getEffectiveFeatures(user.id);
    console.log(`\n[Effective Features Result]`);
    console.log(`closerGalleries: ${features['closerGalleries']}`);

    // 2. Deep Dive into DB State
    const featureKey = 'closerGalleries';
    const feature = await prisma.feature.findUnique({ where: { key: featureKey } });

    // Check PlanFeature directly
    const pf = await prisma.planFeature.findFirst({
        where: { planId: plan.id, featureId: feature?.id! }
    });
    console.log(`\n[DB State: PlanFeature]`);
    console.log(`Enabled: ${pf?.enabled}`);
    console.log(`Limit: ${pf?.limit}`);

    // Check Plan Config directly
    const config = (plan.config as any) || {};
    console.log(`\n[DB State: Plan.config]`);
    console.log(`config.features.${featureKey}: ${config.features?.[featureKey]}`);


    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
}

debugStudioAccess()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
