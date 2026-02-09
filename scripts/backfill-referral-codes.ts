/**
 * Script para asignar códigos de referido a usuarios de pago existentes
 * 
 * Uso: npx tsx scripts/backfill-referral-codes.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateReferralCode(prefix: string = "CL"): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = prefix;
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function main() {
    console.log("🔍 Buscando perfil de cliente...");

    // Buscar perfil de cliente
    const customerProfile = await prisma.referralProfile.findFirst({
        where: {
            type: "CUSTOMER",
            isActive: true
        }
    });

    if (!customerProfile) {
        console.error("❌ No se encontró perfil CUSTOMER activo.");
        console.log("   Ejecuta primero: npx tsx scripts/seed-referral-profiles.ts");
        process.exit(1);
    }

    console.log(`✅ Perfil encontrado: ${customerProfile.name}`);

    // Buscar usuarios con suscripción activa sin código de referido
    console.log("\n🔍 Buscando usuarios de pago sin código...");

    const paidUsersWithoutCode = await prisma.user.findMany({
        where: {
            stripeSubscriptionId: { not: null },
            plan: {
                name: { not: "free" }
            },
            referralAssignments: {
                none: {}
            }
        },
        select: {
            id: true,
            email: true,
            name: true,
            plan: { select: { name: true } }
        }
    });

    console.log(`📊 Usuarios encontrados: ${paidUsersWithoutCode.length}`);

    if (paidUsersWithoutCode.length === 0) {
        console.log("✅ Todos los usuarios de pago ya tienen código de referido.");
        process.exit(0);
    }

    console.log("\n📝 Asignando códigos...\n");

    let created = 0;
    let errors = 0;

    for (const user of paidUsersWithoutCode) {
        try {
            // Generar código único
            let referralCode = generateReferralCode();
            let attempts = 0;

            while (attempts < 10) {
                const exists = await prisma.referralAssignment.findUnique({
                    where: { referralCode }
                });
                if (!exists) break;
                referralCode = generateReferralCode();
                attempts++;
            }

            // Crear asignación
            await prisma.referralAssignment.create({
                data: {
                    userId: user.id,
                    profileId: customerProfile.id,
                    referralCode,
                    status: "ACTIVE"
                }
            });

            console.log(`  ✅ ${user.email} → ${referralCode} (${user.plan?.name})`);
            created++;
        } catch (error) {
            console.error(`  ❌ Error con ${user.email}:`, error);
            errors++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 Resumen:`);
    console.log(`   ✅ Códigos creados: ${created}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log("=".repeat(50));

    if (created > 0) {
        console.log("\n🎉 ¡Listo! Los usuarios pueden ver su código en /dashboard/referrals");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
