import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const code = 'CL8Y56W2' // Value from screenshot
  const assignment = await prisma.referralAssignment.findUnique({
    where: { referralCode: code },
    include: { user: true }
  })
  
  if (assignment) {
    console.log('--- ASSIGNMENT FOUND ---')
    console.log(JSON.stringify(assignment, null, 2))
    
    const referrals = await prisma.referral.findMany({
      where: { assignmentId: assignment.id }
    })
    console.log('\n--- REFERRALS FOR THIS CODE ---')
    console.log(JSON.stringify(referrals, null, 2))
  } else {
    console.log('--- ASSIGNMENT NOT FOUND FOR CODE: ' + code + ' ---')
    // List all assignments just in case
    const all = await prisma.referralAssignment.findMany()
    console.log('All codes in DB:', all.map(a => a.referralCode))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
