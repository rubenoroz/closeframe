import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
export const authConfig = {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid email profile https://www.googleapis.com/auth/drive.file"
                },
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

            // Rutas que requieren protección explícita (además del default)
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

            // Whitelist de rutas públicas
            const isPublicRoute =
                nextUrl.pathname === '/' ||
                nextUrl.pathname.startsWith('/login') ||
                nextUrl.pathname.startsWith('/plan-b') ||
                nextUrl.pathname.startsWith('/api/upload') || // Guest uploads
                nextUrl.pathname.startsWith('/api/auth'); // Auth handlers

            // Si es una ruta protegida explícitamente o no es pública, requerir login
            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            } else if (isLoggedIn) {
                // Si el usuario está logueado y va al login, redirigir al dashboard
                if (nextUrl.pathname.startsWith('/login')) {
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
            }

            // Permitir solo si es pública, logueado, o si no cae en reglas de bloqueo anteriores
            // Nota: Con el matcher del middleware, esto actúa como barrera.
            // Para ser estrictos "secure by default":
            if (!isLoggedIn && !isPublicRoute) {
                // Permitir acceso a galerías públicas (por ahora asumiendo que /g/* o /p/* son públicas o manejan su propia auth)
                // Si no, redirigir a login
                if (nextUrl.pathname.startsWith('/g/') || nextUrl.pathname.startsWith('/p/') || nextUrl.pathname.startsWith('/u/') || nextUrl.pathname.startsWith('/upload/')) {
                    return true;
                }
                return false;
            }

            return true;
        },
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
            }
            return session;
        }
    },
    // Prevent Prisma from being loaded here
} satisfies NextAuthConfig;
