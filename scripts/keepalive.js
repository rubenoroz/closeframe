const { Client } = require('pg');

// Configuración
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('Error: Faltan variables de entorno DATABASE_URL');
    process.exit(1);
}

// Usamos connection string de PG (compatible con Supabase Transaction/Session pooler)
const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Necesario para Supabase en algunos entornos
});

const KEEPALIVE_INTERVAL_HOURS = 48; // Ejecución obligatoria cada 48 horas
const RANDOM_THRESHOLD = 0.25; // 25% de probabilidad de ejecución si no es obligatoria

async function runKeepalive() {
    console.log('Iniciando verificación de keepalive (modo PG)...');

    try {
        await client.connect();

        // 1. Obtener la última ejecución
        const res = await client.query(`
      SELECT created_at FROM public.keepalive_log 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

        let shouldRun = false;
        let reason = '';

        if (res.rowCount === 0) {
            shouldRun = true;
            reason = 'Primera ejecución (tabla vacía)';
        } else {
            const lastRunTime = new Date(res.rows[0].created_at).getTime();
            const now = new Date().getTime();
            const hoursSinceLastRun = (now - lastRunTime) / (1000 * 60 * 60);

            console.log(`Última ejecución hace: ${hoursSinceLastRun.toFixed(2)} horas`);

            if (hoursSinceLastRun >= KEEPALIVE_INTERVAL_HOURS) {
                shouldRun = true;
                reason = `Han pasado más de ${KEEPALIVE_INTERVAL_HOURS} horas`;
            } else {
                // Decisión aleatoria
                if (Math.random() < RANDOM_THRESHOLD) {
                    shouldRun = true;
                    reason = 'Decisión aleatoria (tráfico natural)';
                } else {
                    shouldRun = false;
                    reason = 'Omitido aleatoriamente';
                }
            }
        }

        if (shouldRun) {
            await executeKeepalive(reason);
        } else {
            console.log(`Keepalive OMITIDO. Razón: ${reason}`);
        }

    } catch (err) {
        console.error('Error inesperado en keepalive:', err);
        // Intentamos ejecutar una query simple si falla la lógica principal, para asegurar actividad
        try {
            await client.query('SELECT 1');
            console.log('Fallback: SELECT 1 ejecutado tras error.');
        } catch (e) {
            console.error('Error fatal en fallback:', e);
        }
    } finally {
        await client.end();
    }
}

async function executeKeepalive(reason) {
    console.log(`EJECUTANDO Keepalive. Razón: ${reason}`);

    try {
        await client.query(`
      INSERT INTO public.keepalive_log (status) VALUES ($1)
    `, ['executed']);
        console.log('Keepalive registrado exitosamente.');
    } catch (err) {
        console.error('Error insertando en keepalive_log:', err.message);
    }
}

runKeepalive();
