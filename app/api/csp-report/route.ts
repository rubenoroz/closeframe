import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const data = await req.json();
        console.warn('CSP Violation Detected:', JSON.stringify(data, null, 2));

        // OPCIONAL: Integración con Sentry (comentada por defecto)
        // if (typeof Sentry !== 'undefined') {
        //   Sentry.captureMessage('CSP Violation', {
        //     level: 'warning',
        //     extra: { cspReport: data['csp-report'] || data }
        //   });
        // }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error parsing CSP report:', error);
        return NextResponse.json({ error: 'Invalid report format' }, { status: 400 });
    }
}
