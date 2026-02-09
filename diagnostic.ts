import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('--- DATABASE DIAGNOSIS ---')
  
  const userCount = await prisma.user.count()
  console.log('Total Users:', userCount)
  
  const lastUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { email: true, createdAt: true, planId: true, stripeSubscriptionId: true }
  })
  console.log('Last 10 users:', JSON.stringify(lastUsers, null, 2))
  
  const allAssignments = await prisma.referralAssignment.findMany({
    include: { user: { select: { email: true } } }
  })
  console.log('All Referral Assignments:', JSON.stringify(allAssignments, null, 2))
  
  const angularUser = await prisma.user.findFirst({
    where: { email: 'angular.tv@gmail.com' },
    include: { plan: true }
  })
  console.log('User angular.tv status:', angularUser ? {
    id: angularUser.id,
    plan: angularUser.plan?.name,
    subId: angularUser.stripeSubscriptionId,
    updatedAt: angularUser.updatedAt
  } : 'Not found')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
