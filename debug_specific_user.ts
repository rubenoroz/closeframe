
import { prisma } from './lib/db';
import { getEffectiveFeatures } from './lib/features/service';

async function debugSpecificUser() {
    const email = 'soyrubenoroz@gmail.com';
    console.log(`--- Debugging User: ${email} ---`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { plan: true }
    });

    if (!user) {
        console.error('User not found');
        return;
    }

    console.log(`User ID: ${user.id}`);
    console.log(`Role: ${user.role}`);
    console.log(`Plan: ${user.plan?.name} (${user.planId})`);
    console.log(`Overrides:`, user.featureOverrides);

    const features = await getEffectiveFeatures(user.id);
    console.log(`\n[Effective Features]`);
    console.log(`closerGalleries: ${features['closerGalleries']}`);

    if (features['closerGalleries'] === true) {
        console.log('\n[!] Feature is ENABLED. Why?');
        // Let's trace the logic manually
        if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
            console.log('-> Reason: User is ADMIN/SUPERADMIN (Bypass)');
        } else if (user.featureOverrides && (user.featureOverrides as any)['closerGalleries'] === true) {
            console.log('-> Reason: User has explicit override');
        } else {
            console.log('-> Reason: Plan config or PlanFeature is enabling it.');

            // Check PlanFeature
            const pf = await prisma.planFeature.findFirst({
                where: { planId: user.planId!, feature: { key: 'closerGalleries' } }
            });
            console.log(`   PlanFeature enabled? ${pf?.enabled}`);

            // Check Config
            const config = user.plan?.config as any;
            console.log(`   Plan Config enabled? ${config?.features?.['closerGalleries']}`);
        }
    } else {
        console.log('\n[OK] Feature is DISABLED in backend.');
        console.log('If user sees it enabled, it MUST be client-side cache or stale session.');
    }
}

debugSpecificUser()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
