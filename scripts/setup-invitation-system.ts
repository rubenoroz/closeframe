
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando configuración del sistema de invitaciones ---');

    // 1. Crear feature invitationQuota
    const featureKey = 'invitationQuota';
    console.log(`Verificando feature: ${featureKey}...`);

    const existingFeature = await prisma.feature.findUnique({
        where: { key: featureKey }
    });

    if (!existingFeature) {
        await prisma.feature.create({
            data: {
                key: featureKey,
                description: 'Límite de invitaciones que el usuario puede generar (0 para ninguno, -1 para ilimitado)',
                category: 'LIMITS',
                defaultValue: false // Por defecto no tienen cuota (indicado por enabled/limit en la matriz)
            }
        });
        console.log(`✅ Feature "${featureKey}" creada.`);
    } else {
        console.log(`ℹ️ La feature "${featureKey}" ya existe.`);
    }

    // 2. Grandfathering: Marcar usuarios actuales como invitados
    console.log('Marcando usuarios actuales como invitados para preservar su acceso...');
    const result = await prisma.user.updateMany({
        where: {
            isInvited: false // Solo los que no han sido marcados
        },
        data: {
            isInvited: true
        }
    });

    console.log(`✅ ${result.count} usuarios marcados como invitados.`);
    console.log('--- Configuración completada con éxito ---');
}

main()
    .catch(e => {
        console.error('❌ Error durante la configuración:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
