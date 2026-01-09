# SaaS Authentication Implementation Plan

**Objective**: Secure the platform so multiple users can have isolated workspaces. A user must log in to access the Dashboard.

## 1. Technology Stack
*   **Library**: NextAuth.js (v5 Beta recommended for Next.js 14 App Router)
*   **Provider**: Google OAuth (for Login) + Email/Password (optional later, start with Google for speed).
*   **Adapter**: Prisma Adapter (connects Auth to our SQLite/Postgres DB).

## 2. Database Schema Changes
We need to add standard NextAuth tables to `prisma/schema.prisma`.
*   `Account`: For authentication providers (Google, GitHub, etc). *Note: This is different from our custom `CloudAccount`.*
*   `Session`: For database strategies (optional if using JWT, but good for security).
*   `VerificationToken`: For magic links (if we add email auth).

**Action**: Rename our current `CloudAccount` to avoid confusion? Or just be careful.
*   NextAuth uses `Account`.
*   We use `CloudAccount` for Drive integration.
*   *Conflict Risk*: Low, as long as we don't name our table `Account`.

## 3. Implementation Steps

### Step 1: Install Dependencies
```bash
npm install next-auth@beta @auth/prisma-adapter
```

### Step 2: Update Prisma Schema
Add the required models.
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
// Add Session, VerificationToken...
```
*Run `npx prisma migrate dev`.*

### Step 3: Configure NextAuth (`auth.ts`)
Create the central auth configuration in `auth.ts` (root or lib).
*   Configure Google Provider.
*   Configure Prisma Adapter.

### Step 4: Create API Route
`app/api/auth/[...nextauth]/route.ts`.

### Step 5: Protect Dashboard
*   Create `middleware.ts` to redirect unauthenticated users from `/dashboard` to `/login`.
*   Create `app/login/page.tsx`.

### Step 6: Update User Data Fetching
Refactor `POST /api/projects` and `GET /api/projects` to use `auth()` session instead of `prisma.user.findFirst()`.

## 4. Verification
1.  Verify Login with Google works.
2.  Verify Session persists.
3.  Verify `/dashboard` is inaccessible without login.
4.  Verify created projects are linked to the *logged-in* user.
