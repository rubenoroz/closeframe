import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2];

async function main() {
    if (!email) {
        console.error("❌ Por favor proporciona el email del usuario.");
        console.log("Uso: npx tsx scripts/set-superadmin.ts tu@email.com");
        process.exit(1);
    }

    console.log(`🔍 Buscando usuario: ${email}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`❌ No se encontró ningún usuario con el email: ${email}`);
            process.exit(1);
        }

        const updated = await prisma.user.update({
            where: { email },
            data: { role: "SUPERADMIN" },
        });

        console.log(`✅ ¡Éxito! El usuario ${updated.email} ahora es SUPERADMIN.`);
    } catch (error) {
        console.error("❌ Error actualizando usuario:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
