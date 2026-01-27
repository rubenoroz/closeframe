#!/usr/bin/env npx tsx
/**
 * Script para promover un usuario a SUPERADMIN
 * Uso: npx tsx scripts/promote-superadmin.ts <email>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.log("❌ Uso: npx tsx scripts/promote-superadmin.ts <email>");
        console.log("   Ejemplo: npx tsx scripts/promote-superadmin.ts tu@email.com");
        process.exit(1);
    }

    console.log(`🔍 Buscando usuario con email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, role: true }
    });

    if (!user) {
        console.log(`❌ No se encontró usuario con email: ${email}`);
        process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.name || user.email}`);
    console.log(`   Rol actual: ${user.role}`);

    if (user.role === "SUPERADMIN") {
        console.log("ℹ️  El usuario ya es SUPERADMIN");
        process.exit(0);
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: "SUPERADMIN" },
        select: { id: true, name: true, email: true, role: true }
    });

    console.log(`🎉 ¡Usuario promovido a SUPERADMIN!`);
    console.log(`   ${updatedUser.name || updatedUser.email} (${updatedUser.role})`);
}

main()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
