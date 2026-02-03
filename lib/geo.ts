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
    const country = headers.get('x-vercel-ip-country');

    // En desarrollo local, el header no existe
    // Puedes forzar una región para testing con un query param o cookie
    if (!country) {
        // Fallback para desarrollo: revisar si hay un override
        const forceRegion = headers.get('x-force-region');
        if (forceRegion === 'MX' || forceRegion === 'INTL') {
            return forceRegion;
        }
        // Default a MX en desarrollo (estás en México)
        return 'MX';
    }

    return country === 'MX' ? 'MX' : 'INTL';
}

/**
 * Obtiene el símbolo de moneda según la región
 */
export function getCurrencySymbol(region: Region): string {
    return region === 'MX' ? '$' : '$';
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
