import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

import Resend from "next-auth/providers/resend";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days (default is 30 days)
    },
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
                        const { getFeatureLimit, canUseFeature } = await import("@/lib/features/service");

                        // Check if referral program is enabled for this referrer
                        const isEnabled = await canUseFeature(assignment.userId, 'referralProgramEnabled');

                        if (isEnabled) {
                            const maxReferrals = await getFeatureLimit(assignment.userId, 'invitationQuota');

                            // If limit is null, maybe fallback to legacy maxReferrals or assume 0
                            // If limit is -1, it's unlimited.
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

                            console.log(`[AUTH] Referrer usage: ${usageCount}/${maxReferrals ?? 0}`);

                            if (usageCount < (maxReferrals ?? 0)) {
                                return true;
                            } else {
                                console.log("[AUTH] Referrer limit reached.");
                            }
                        } else {
                            console.log("[AUTH] Referral program disabled for this referrer.");
                        }
                    } else {
                        console.log("[AUTH] Invalid referral assignment.");
                    }
                } else {
                    console.log("[AUTH] No referral cookie found.");
                }

                // [REVERTED RESTRICTION] Allow all users to register to eliminate blockers.
                console.log(`[AUTH] Allowing registration for ${user.email} (Restrictions disabled).`);
                return true;

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
                        select: {
                            role: true,
                            planId: true,
                            isInvited: true,
                            username: true,
                            businessName: true,
                            plan: { select: { name: true } }
                        }
                    });
                    token.role = dbUser?.role || "USER";
                    token.planId = dbUser?.planId || null;
                    token.planName = dbUser?.plan?.name || null;
                    token.isInvited = dbUser?.isInvited || false;
                    token.username = dbUser?.username || null;
                    token.businessName = dbUser?.businessName || null;
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    token.role = "USER";
                    token.planId = null;
                    token.planName = null;
                    token.isInvited = false;
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
                (session.user as { isInvited?: boolean }).isInvited = token.isInvited as boolean || false;
                (session.user as { username?: string | null }).username = token.username as string | null;
                (session.user as { businessName?: string | null }).businessName = token.businessName as string | null;
            }
            return session;
        },
    },
    events: {
        async createUser({ user }) {
            console.log(`[AUTH] NEW USER CREATED: ${user.email}. Checking for referral cookie...`);

            try {
                const { cookies } = await import("next/headers");
                const cookieStore = await cookies();
                const referralCode = cookieStore.get("cl_ref")?.value;

                if (referralCode && user.id && user.email) {
                    console.log(`[AUTH] Found referral code ${referralCode} for new user ${user.email}. Registering...`);

                    const { createReferralOnRegistration } = await import("@/lib/services/referral.service");

                    const result = await createReferralOnRegistration(
                        referralCode,
                        user.email,
                        user.id
                    );

                    if (result.success) {
                        console.log(`[AUTH] Successfully registered referral for ${user.email}. Marking as invited.`);
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { isInvited: true }
                        });
                    } else {
                        console.warn(`[AUTH] Failed to register referral: ${result.error}`);
                    }
                } else {
                    console.log("[AUTH] No referral code found for new user.");
                }

                // --- DEFAULT PLAN ASSIGNMENT ---
                if (user.id) {
                    console.log(`[AUTH] Assigning default FREE plan to user ${user.id}`);
                    const freePlan = await prisma.plan.findFirst({
                        where: { name: "free" }
                    });

                    if (freePlan) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { planId: freePlan.id }
                        });
                        console.log(`[AUTH] Plan 'free' (${freePlan.id}) assigned to user ${user.id}`);
                    } else {
                        console.error("[AUTH] CRITICAL: Plan 'free' not found in database. Cannot assign default plan.");
                    }
                }
            } catch (error) {
                console.error("[AUTH] Error in createUser event:", error);
            }
        }
    },
    debug: process.env.NODE_ENV === "development",
});
