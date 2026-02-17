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
        async signIn({ user, account, profile }) {
            console.log(`[AUTH] Attempting sign in for: ${user.email}`);

            try {
                // 1. Allow existing users
                // We use findFirst to avoid unique constraint issues if email is somehow null (shouldn't be)
                if (!user.email) {
                    console.log("[AUTH] No email provided, denying.");
                    return false;
                }

                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email }
                });

                if (existingUser) {
                    console.log(`[AUTH] User ${user.email} exists. Allow.`);
                    return true;
                }

                console.log(`[AUTH] New user ${user.email}. Checking for invites...`);

                // 2. New User - Check for Invite
                const { cookies } = await import("next/headers");
                const cookieStore = await cookies();

                // Check Global Registration Setting to be safe
                const globalSettings = await prisma.systemSettings.findUnique({
                    where: { key: "allowRegistration" }
                });
                // If strictly disabled in settings, block everyone (even invites? Discussable. Let's assume Invite overrides)
                // For now, let's just log it.

                // Check Master Code (Beta Key)
                const betaCode = cookieStore.get("invite_code")?.value;
                const masterCodeSetting = await prisma.systemSettings.findUnique({
                    where: { key: "masterInviteCode" }
                });
                const MASTER_CODE = masterCodeSetting?.value || process.env.BETA_MASTER_CODE;

                if (MASTER_CODE && betaCode === MASTER_CODE) {
                    console.log("[AUTH] Valid Master Code found. Allow.");
                    return true;
                }

                // Check Referral Cookie
                const referralCode = cookieStore.get("cl_ref")?.value;
                if (referralCode) {
                    console.log(`[AUTH] Referral code found: ${referralCode}`);
                    // Validate Referrer
                    const assignment = await prisma.referralAssignment.findFirst({
                        where: { referralCode, status: "ACTIVE" },
                        include: { user: { include: { plan: true } } }
                    });

                    if (assignment && assignment.user) {
                        const planConfig = assignment.user.plan?.config as any || {};
                        const limits = planConfig.limits || {};
                        const features = planConfig.features || {};

                        const isEnabled = features.referralProgramEnabled ?? false;

                        if (isEnabled) {
                            const maxReferrals = limits.maxReferrals ?? 0;

                            if (maxReferrals === -1) {
                                console.log("[AUTH] Referrer has unlimited invites. Allow.");
                                return true;
                            }

                            const usageCount = await prisma.referral.count({
                                where: {
                                    assignmentId: assignment.id,
                                    status: { not: "CANCELLED" }
                                }
                            });

                            console.log(`[AUTH] Referrer usage: ${usageCount}/${maxReferrals}`);

                            if (usageCount < maxReferrals) {
                                return true;
                            } else {
                                console.log("[AUTH] Referrer limit reached.");
                            }
                        } else {
                            console.log("[AUTH] Referral program disabled for this referrer's plan.");
                        }
                    } else {
                        console.log("[AUTH] Invalid referral assignment.");
                    }
                } else {
                    console.log("[AUTH] No referral cookie found.");
                }

                // If we get here, no valid invite found
                console.log("[AUTH] Denying access. InviteRequired.");
                // Return a specific error query to show the message on login page
                return "/login?error=InviteRequired";

            } catch (error) {
                console.error("[AUTH] Error in signIn callback:", error);
                // Fail safe: Allow or Block? Block is safer for invite-only.
                return false;
            }
        },
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
