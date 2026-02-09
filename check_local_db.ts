import { PrismaClient } from '@prisma/client'

async function main() {
  const localUrl = 'postgresql://univa:@localhost:5432/postgres' // Common default on Mac
  console.log('--- CHECKING LOCAL POSTGRES ---')
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url: localUrl }
    }
  })

  try {
    const userCount = await prisma.user.count()
    console.log('Total Users (Local):', userCount)
    
    if (userCount > 0) {
      const lastUser = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } })
      console.log('Last User (Local):', lastUser?.email, lastUser?.createdAt)
      
      const assignments = await prisma.referralAssignment.findMany()
      console.log('Assignments (Local):', assignments.map(a => a.referralCode))
    }
  } catch (e: any) {
    console.log('Local Postgres error or no table found:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
