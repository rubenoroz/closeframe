
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FEATURE_POOL = [
    {
        id: "commissionPercentage",
        label: "Comisión por Venta (%)",
        description: "Porcentaje retenido por plataforma",
        category: "monetization",
        type: "number",
        defaultValue: 15
    },
    {
        id: "referralProgramEnabled",
        label: "Programa de Referidos",
        description: "Permitir invitar a otros usuarios",
        category: "system",
        type: "boolean",
        defaultValue: false
    },
    {
        id: "maxReferrals",
        label: "Límite de Invitaciones",
        description: "Máx. usuarios invitados (-1 = Ilimitado)",
        category: "system",
        type: "number",
        defaultValue: 0
    }
    // I could add more here if needed, but this is the critical one missing
];

async function main() {
    console.log("Checking for missing features...");

    for (const feature of FEATURE_POOL) {
        const existing = await prisma.feature.findUnique({
            where: { id: feature.id }
        });

        if (!existing) {
            console.log(`Creating missing feature: ${feature.id}`);
            await prisma.feature.create({
                data: {
                    id: feature.id,
                    key: feature.id,
                    description: feature.description,
                    category: feature.category,
                    defaultValue: true // Schema requires boolean. For limits, true means 'enabled' to have a limit.
                }
            });
            console.log(`Created ${feature.id}`);
        } else {
            console.log(`Feature ${feature.id} already exists.`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
