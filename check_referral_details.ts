import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const referrals = await prisma.referral.findMany({
    include: {
      assignment: { include: { user: true } },
      referredUser: true
    }
  })
  console.log('--- ALL REFERRALS ---')
  console.log(JSON.stringify(referrals, null, 2))

  const commissions = await prisma.referralCommission.findMany()
  console.log('\n--- ALL COMMISSIONS ---')
  console.log(JSON.stringify(commissions, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
