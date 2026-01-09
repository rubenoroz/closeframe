import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    // Use JWT for sessions (works in Edge Runtime)
    session: {
        strategy: "jwt",
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    pages: {
        signIn: "/login",
    },
    trustHost: true,
    callbacks: {
        async jwt({ token, user, trigger }) {
            // Persist user id to the token on first sign in
            if (user) {
                token.id = user.id;
            }

            // Obtener rol del usuario desde la BD
            // Solo consultar si tenemos un id y el rol no está en el token
            if (token.id && (!token.role || user || trigger === "update")) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { role: true, planId: true }
                    });
                    token.role = dbUser?.role || "USER";
                    token.planId = dbUser?.planId || null;
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    token.role = "USER";
                    token.planId = null;
                }
            }

            return token;
        },
        async session({ session, token }) {
            // Add user ID and role to session from JWT token
            if (session.user && token.id) {
                session.user.id = token.id as string;
                (session.user as { role?: string }).role = token.role as string || "USER";
                (session.user as { planId?: string | null }).planId = token.planId as string | null;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            if (url.startsWith(baseUrl)) return url;
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            return baseUrl + "/dashboard";
        },
    },
    debug: process.env.NODE_ENV === "development",
});
