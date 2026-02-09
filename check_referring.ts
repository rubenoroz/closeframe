import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const assignments = await prisma.referralAssignment.findMany({
    include: { user: true }
  })
  console.log('--- ASSIGNMENTS ---')
  console.log(JSON.stringify(assignments, null, 2))
  
  const referrals = await prisma.referral.findMany()
  console.log('\n--- REFERRALS COUNT ---')
  console.log(referrals.length)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
