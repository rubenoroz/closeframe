import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Conectando a la base de datos de producción...");
    try {
        // Intentar contar usuarios (verifica que la tabla User existe)
        const userCount = await prisma.user.count();
        console.log(`✅ Conexión exitosa. Tablas detectadas. Usuarios actuales: ${userCount}`);

        // Intentar leer settings (verifica SystemSettings)
        const settings = await prisma.systemSettings.findFirst();
        console.log("✅ Tabla SystemSettings accesible.");

    } catch (error) {
        console.error("❌ Error de conexión o esquema faltante:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
