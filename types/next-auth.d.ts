import NextAuth, { DefaultSession } from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            role: UserRole
        } & DefaultSession["user"]
    }

    interface User {
        role?: UserRole
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: UserRole
    }
}
