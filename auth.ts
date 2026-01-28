import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

import Resend from "next-auth/providers/resend";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    ...authConfig,
    providers: [
        ...authConfig.providers,
        Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.EMAIL_FROM || "onboarding@resend.dev"
        })
    ],
    callbacks: {
        ...authConfig.callbacks,
        // Override JWT to add DB role check (Node.js only)
        async jwt({ token, user, trigger }) {
            // First run base jwt logic
            if (user) {
                token.id = user.id;
            }

            // Then DB check
            if (token.id && (!token.role || user || trigger === "update")) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { role: true, planId: true, plan: { select: { name: true } } }
                    });
                    token.role = dbUser?.role || "USER";
                    token.planId = dbUser?.planId || null;
                    token.planName = dbUser?.plan?.name || null;
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    token.role = "USER";
                    token.planId = null;
                    token.planName = null;
                }
            }
            return token;
        },
        // Override Session to pass role
        async session({ session, token }) {
            // Base session logic
            if (session.user && token.id) {
                session.user.id = token.id as string;
                (session.user as { role?: string }).role = token.role as string || "USER";
                (session.user as { planId?: string | null }).planId = token.planId as string | null;
                (session.user as { planName?: string | null }).planName = token.planName as string | null;
            }
            return session;
        },
    },
    debug: process.env.NODE_ENV === "development",
});
