import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Configure Prisma with connection pool settings optimized for serverless
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        // In serverless environments, we want to minimize connection pool size
        // to avoid hitting PgBouncer session mode limits
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });

// Always cache the prisma client in global to prevent connection pool exhaustion
// This is critical in serverless environments (Vercel) where each invocation
// would otherwise create a new PrismaClient instance
if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma;
} else {
    // console.log("Reusing cached Prisma client");
}
