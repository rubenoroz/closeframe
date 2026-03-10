import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizeCss: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            // [P10] HSTS MEJORADO
            // Precaución: 'includeSubDomains' afecta a TODOS los subdominios.
            // Asegúrate de que subdominios como 'send.closerlens.com' tengan proxy HTTPS activo
            // antes de añadirlo a precarga (preload) en Chrome.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            // [P4] Prevenir Clickjacking en galerías de clientes
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            // [P5] Desactivar MIME sniffing en archivos subidos
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            // [P6] Prevenir fuga de URLs de galerías privadas
            key: 'Referrer-Policy',
            value: 'no-referrer'
          },
          {
            // [P7] Declaración de APIs permitidas
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()'
          },
          {
            // [P8] Cross-Origin Headers (Aislamiento)
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin'
          }
          // Nota sobre COEP (Cross-Origin-Embedder-Policy): 
          // Si activamos { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' }, 
          // es muy probable que se rompan las imágenes o scripts cruzados (Google Drive, Dropbox)
          // a menos que ellos envíen el header CORS correcto. Lo mantenemos omitido por ahora
          // tras un análisis de la arquitectura.
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: '/u/:username',
        destination: '/labs/profile/:username',
        // Nota sobre CSP: La configuración de Content-Security-Policy (CSP) se gestiona desde
        // middleware.ts para poder inyectar nonces dinámicos criptográficamente seguros.
      },
    ];
  },
};

export default nextConfig;
