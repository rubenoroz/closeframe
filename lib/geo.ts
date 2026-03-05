/**
 * Utilidades de detección geográfica para precios regionales
 */

export type Region = 'MX' | 'INTL';

/**
 * Detecta la región del visitante basándose en headers de Vercel
 * @param headers - Headers de la request
 * @returns 'MX' si está en México, 'INTL' para cualquier otro país
 */
export function getRegionFromHeaders(headers: Headers): Region {
    // Vercel provee automáticamente este header en producción
    const country = headers.get('x-vercel-ip-country')?.toUpperCase().trim();
    const acceptLanguage = headers.get('accept-language')?.toLowerCase() || "";

    // Log para depuración en Vercel (opcional, pero útil ahora)
    console.log(`[GEO] Country: ${country}, Language: ${acceptLanguage}`);

    // Prioridad 1: Vercel Country Header
    if (country === 'MX') return 'MX';

    // Prioridad 2: Idioma del navegador (es-MX)
    if (acceptLanguage.includes('es-mx')) return 'MX';

    // Fallback para desarrollo o cuando falten headers
    if (!country) {
        // Fallback para desarrollo: revisar si hay un override
        const forceRegion = headers.get('x-force-region')?.toUpperCase().trim();
        if (forceRegion === 'MX' || forceRegion === 'INTL') {
            return forceRegion as Region;
        }
        // Default a MX en desarrollo
        return 'MX';
    }

    return 'INTL';
}

/**
 * Obtiene el símbolo de moneda según la región
 */
export function getCurrencySymbol(region: Region): string {
    return '$'; // Ambos usan '$', pero se mantiene la lógica si cambiara en el futuro
}

/**
 * Obtiene el código de moneda según la región
 */
export function getCurrencyCode(region: Region): string {
    return region === 'MX' ? 'MXN' : 'USD';
}

/**
 * Formatea un precio según la región
 */
export function formatPrice(amount: number, region: Region): string {
    const locale = region === 'MX' ? 'es-MX' : 'en-US';
    const currency = getCurrencyCode(region);

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
