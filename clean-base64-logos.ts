// Script para limpiar logos base64 (data URI) de todos los usuarios
// Estos no funcionan como OG images - requieren URLs HTTP
// Ejecutar con: npx tsx clean-base64-logos.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanBase64Logos() {
    console.log('🔍 Buscando usuarios con logos en formato base64...');

    // Buscar usuarios que tengan logos que empiecen con "data:"
    const usersWithBase64Logo = await prisma.user.findMany({
        where: {
            businessLogo: { startsWith: 'data:' }
        },
        select: {
            id: true,
            email: true,
            businessName: true,
            businessLogo: true,
        }
    });

    console.log(`📋 Encontrados ${usersWithBase64Logo.length} usuarios con logos base64:`);

    for (const user of usersWithBase64Logo) {
        const logoPreview = user.businessLogo?.substring(0, 50) + '...';
        console.log(`  - ${user.email} (${user.businessName || 'Sin nombre'}): ${logoPreview}`);
    }

    if (usersWithBase64Logo.length === 0) {
        console.log('✅ No hay usuarios con logos base64 para limpiar.');
        return;
    }

    // Limpiar los logos
    console.log('\n🧹 Limpiando logos base64...');

    const result = await prisma.user.updateMany({
        where: {
            businessLogo: { startsWith: 'data:' }
        },
        data: {
            businessLogo: null
        }
    });

    console.log(`✅ Se limpiaron ${result.count} logos de usuarios.`);
    console.log('📌 Ahora esas galerías mostrarán el logo de CloserLens por defecto.');
}

cleanBase64Logos()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
