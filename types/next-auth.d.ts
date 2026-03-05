import NextAuth, { DefaultSession } from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            role: UserRole
            username?: string | null
            businessName?: string | null
        } & DefaultSession["user"]
    }

    interface User {
        role?: UserRole
        username?: string | null
        businessName?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: UserRole
    }
}
