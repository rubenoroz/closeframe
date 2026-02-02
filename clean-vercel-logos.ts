// Script para limpiar logos de Vercel de todos los usuarios
// Ejecutar con: npx tsx clean-vercel-logos.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanVercelLogos() {
    console.log('🔍 Buscando usuarios con logos de Vercel...');

    // Buscar usuarios que tengan logos que contengan "vercel" o el triángulo por defecto
    const usersWithVercelLogo = await prisma.user.findMany({
        where: {
            OR: [
                { businessLogo: { contains: 'vercel' } },
                { businessLogo: { contains: 'triangle' } },
                { businessLogo: { contains: 'next.svg' } },
                { businessLogo: { contains: 'vercel.svg' } },
            ]
        },
        select: {
            id: true,
            email: true,
            businessName: true,
            businessLogo: true,
        }
    });

    console.log(`📋 Encontrados ${usersWithVercelLogo.length} usuarios con logos de Vercel:`);

    for (const user of usersWithVercelLogo) {
        console.log(`  - ${user.email} (${user.businessName || 'Sin nombre'}): ${user.businessLogo}`);
    }

    if (usersWithVercelLogo.length === 0) {
        console.log('✅ No hay usuarios con logos de Vercel para limpiar.');
        return;
    }

    // Limpiar los logos
    console.log('\n🧹 Limpiando logos...');

    const result = await prisma.user.updateMany({
        where: {
            OR: [
                { businessLogo: { contains: 'vercel' } },
                { businessLogo: { contains: 'triangle' } },
                { businessLogo: { contains: 'next.svg' } },
                { businessLogo: { contains: 'vercel.svg' } },
            ]
        },
        data: {
            businessLogo: null
        }
    });

    console.log(`✅ Se limpiaron ${result.count} logos de usuarios.`);
    console.log('📌 Ahora esas galerías mostrarán el logo de CloserLens por defecto.');
}

cleanVercelLogos()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
