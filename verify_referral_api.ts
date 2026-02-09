import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Simulate the GET /api/referrals/my logic
  const userId = 'cmk7bmmif00009ssnbugglr6o'; // rubenoroz@gmail.com
  
  const assignments = await prisma.referralAssignment.findMany({
    where: { userId },
    include: {
      profile: true,
      referrals: { take: 5 },
      commissions: true
    }
  });

  const stats = assignments.map(a => ({
    totalClicks: a.totalClicks,
    totalReferrals: a.totalReferrals,
    totalConverted: a.totalConverted,
    totalEarned: Number(a.totalEarned),
    recentReferrals: a.referrals
  }));

  console.log('--- API SIMULATION ---');
  console.log(JSON.stringify(stats, null, 2));
}

main().finally(() => prisma.$disconnect())
