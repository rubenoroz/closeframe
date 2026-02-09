import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      email: true,
      planId: true,
      stripeSubscriptionId: true,
      createdAt: true
    }
  })
  console.log('--- RECENT USERS ---')
  console.log(JSON.stringify(users, null, 2))

  const referrals = await prisma.referral.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      assignment: true
    }
  })
  console.log('\n--- RECENT REFERRALS ---')
  console.log(JSON.stringify(referrals, null, 2))

  const commissions = await prisma.referralCommission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log('\n--- RECENT COMMISSIONS ---')
  console.log(JSON.stringify(commissions, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
