
import { PrismaClient } from '@prisma/client';
import { canUseFeature, getFeatureLimit } from '../lib/features/service';

const prisma = new PrismaClient();

async function verifyNodosGating() {
    console.log("🔍 Starting Nodos Gating Verification...");

    // Find a FREE user
    const freeUser = await prisma.user.findFirst({
        where: { plan: { name: 'free' } },
    });

    if (!freeUser) {
        // Fallback to searching by plan ID if name doesn't match exactly
        const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
        if (freePlan) {
            const user = await prisma.user.findFirst({ where: { planId: freePlan.id } });
            if (user) return verifyWithUser(user, 'free');
        }
        console.error("❌ No FREE user found for testing.");
        return;
    }

    await verifyWithUser(freeUser, 'free');
}

async function verifyWithUser(user: any, planName: string) {
    console.log(`👤 Testing with User: ${user.email} (Plan: ${planName})`);

    // 1. Check feature access
    const hasAccess = await canUseFeature(user.id, 'nodosAccess');
    console.log(`📡 nodosAccess: ${hasAccess ? '✅ ENABLED' : '❌ DISABLED'}`);

    // 2. Check project limit
    const limit = await getFeatureLimit(user.id, 'maxNodosProjects');
    console.log(`📊 maxNodosProjects Limit: ${limit}`);

    // 3. Count owned projects
    const ownedCount = await prisma.nodosProject.count({
        where: { ownerId: user.id }
    });
    console.log(`📂 Owned Projects: ${ownedCount}`);

    // 4. Determine canCreate (logic from dashboard)
    const canCreate = (limit === -1) || ((limit !== null) && (ownedCount < limit));
    console.log(`🆕 canCreate: ${canCreate ? '✅ YES' : '❌ NO'}`);

    if (limit === 0 && !canCreate) {
        console.log("✅ SUCCESS: Free user correctly restricted from creating Nodos projects.");
    } else {
        console.log("⚠️ Limit is non-zero or canCreate is unexpected.");
    }
}

verifyNodosGating()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
