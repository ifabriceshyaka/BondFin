# BondFin Collective - Master Project Instruction

**Purpose:** Persistent project context for VS Code Copilot/Luna.

## BondFin Identity

BondFin Collective is a digital rotating savings group (ROSCA) built for a small, trusted circle of 10 members. It is not a social network, public platform, or generic member-management app. It is a private financial collective with one specific purpose: investing in one another.

- Each member contributes $100 every two weeks.
- The group pools $1,000 per cycle.
- One member receives the pooled payout per cycle.
- The rotation continues until all 10 members receive a payout.
- The cycle repeats as needed.
- The app tracks contributions, payouts, and rotation order.
- The system provides transparency, fairness, and accountability.

All code, architecture, and features must support this rotating savings model.

## System Architecture

BondFin uses:

- Next.js App Router 16.x
- Supabase Auth
- Supabase Database with RLS
- Supabase Storage
- Server Components for protected pages
- Client Components only for login and signup forms
- SSR authentication using `@supabase/ssr`
- Automatic profile creation through database triggers

Never switch to the Pages Router, remove SSR, or weaken RLS.

## Authentication Rules

1. Signup collects `full_name`, `email`, and `password`.
2. Signup stores `full_name` in Auth metadata.
3. A Supabase trigger automatically creates the matching row in `public."Users"`.
4. Do not perform client-side upserts into `Users`.
5. Do not use manual profile inserts as a replacement for the trigger.
6. Dashboard and members pages are protected server-side. Unauthenticated users redirect to `/auth/login`; authenticated users load data server-side.
7. Logout is a server action using `supabase.auth.signOut()`.

## Supabase Client Boundaries

The server Supabase client is used only in server Components, route handlers, and server actions. The client Supabase client is used only in login, signup, and other Client Components.

Never use `next/headers` inside a Client Component. Never import the server Supabase client into a client page.

## RLS Rules

BondFin is a private financial collective. Security is non-negotiable.

Current profile policy:

- Only authenticated users can read their own profile.
- No anonymous access.
- No public read access.
- No admin bypass unless explicitly defined.
- Do not expose emails or sensitive fields on public pages.

The current own-profile condition is:

```sql
lower(email) = lower(auth.jwt() ->> 'email')
```

Never weaken RLS or suggest removing it.

## Dashboard Behavior

The dashboard must be a Server Component, use the SSR Supabase client, redirect unauthenticated users, and load protected data server-side. It is expected to show:

- Member name
- Contribution status
- Payout round
- Payout date
- Group rotation order
- Optional profile picture

Keep the dashboard clean and minimal.

## Members Page Rules

Before modifying `/members`, ask and record the access decision:

1. Should each user see only themselves?
2. Should all authenticated users see the member list?
3. Should only admins see the member list?

Do not invent a `members` table or RLS policy until the schema and access model are finalized.

## Approved Features

- Automatic profile creation through a database trigger
- Full-name synchronization from Auth to `Users`
- Optional profile picture upload
- Contribution tracking, future
- Payout rotation logic, future
- Cycle schedule, future
- Group financial summary, future
- Admin role, future and not yet implemented
- Clean minimal dashboard layout

Do not add feature creep or platform-level complexity.

## Design Philosophy

BondFin is simple, secure, minimal, predictable, professional, and maintainable. Do not add social features, messaging, notifications, analytics dashboards, complex admin panels, multi-tenant systems, public financial pages, or unnecessary abstractions.

BondFin is a rotating savings group, not a platform.

## Copilot/Luna Role

Follow this scope strictly. Keep the architecture consistent. Do not change project direction, weaken security, mix server and client Supabase usage, or suggest features outside BondFin's purpose. Before implementing new functionality, explain the reason, expected behavior, affected files, and validation plan. Ask before making decisions about the members schema, admin roles, financial rules, or broad visual redesigns.

## Final Identity Statement

BondFin Collective is a digital rotating savings group (ROSCA) built for a trusted circle of 10 members, where each member contributes $100 every two weeks and receives a payout in a rotating cycle. The application provides secure authentication, protected dashboards, strict RLS, automatic profile creation, and financial rotation tracking. All development must support this purpose and remain within this scope.
