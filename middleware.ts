import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    // CSP Configurado como pide el usuario para OAuth y los provedores mencionados
    const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.closerlens.com;
    frame-src 'self' https://app.koofr.net https://www.dropbox.com https://*.google.com https://*.onedrive.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
    report-uri /api/csp-report;
  `.replace(/\s{2,}/g, ' ').trim();

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);

    // Next.js (App Router) nos recomienda enviar un header con el CSP
    // a la 'request' también para poderlo leer en layouts estáticos
    requestHeaders.set('Content-Security-Policy-Report-Only', cspHeader);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    response.headers.set('Content-Security-Policy-Report-Only', cspHeader);
    return response;
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
