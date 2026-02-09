import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

async function checkUrl(url: string, label: string) {
    console.log(`--- CHECKING ${label} ---`);
    console.log(`URL: ${url.split('@')[1]}`); // Hide credentials
    
    const prisma = new PrismaClient({
        datasources: {
            db: { url }
        }
    });

    try {
        const userCount = await prisma.user.count();
        const lastUser = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
        const assignments = await prisma.referralAssignment.findMany();
        
        console.log(`Users: ${userCount}`);
        console.log(`Last User: ${lastUser?.email} (${lastUser?.createdAt.toISOString()})`);
        console.log(`Codes: ${assignments.map(a => a.referralCode).join(', ')}`);
        
        const angular = await prisma.user.findFirst({ where: { email: 'angular.tv@gmail.com' } });
        console.log(`Angular.tv Plan: ${angular?.planId || 'None'} (Updated: ${angular?.updatedAt.toISOString()})`);
        
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    const envContent = fs.readFileSync('.env', 'utf8');
    const localContent = fs.readFileSync('.env.local', 'utf8');
    
    const envUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];
    const localUrl = localContent.match(/DATABASE_URL="([^"]+)"/)?.[1];

    if (envUrl) await checkUrl(envUrl, '.env');
    if (localUrl) await checkUrl(localUrl, '.env.local');
}

main();
