# BondFin Collective — Project Context

## 1. Project Identity
BondFin Collective is a private rotating savings group (ROSCA) for 10 trusted members.

This is not:
- a social platform
- a public app
- a messaging system
- an analytics dashboard
- a SaaS product
- a multi-tenant system

BondFin is a simple, secure, private financial collective designed around a rotating savings model.

## 2. Core ROSCA Model
- Each member contributes $100 every two weeks
- Member contribution obligations total $1,000 per cycle
- Members pay the cycle's recipient directly; the other nine members transfer $900 total, while the recipient retains their own $100 contribution
- One member receives the direct payments each cycle
- Rotation continues until all 10 members have received payout
- The app tracks:
  - members
  - contributions
  - payout order
  - payout dates
  - cycle status
  - financial transparency

All product and engineering work must support this ROSCA model and no feature may drift away from it.

## 3. Architecture Rules
Use:
- Next.js App Router
- React
- Supabase Auth
- Supabase Database
- Supabase Storage
- Supabase Row Level Security
- @supabase/ssr
- Server Components for protected pages
- Client Components only for login, signup, or browser-only interactions

Strict rules:
- Never switch to the Pages Router
- Never weaken SSR authentication
- Never import a server Supabase client into a client component
- Never import next/headers into client components
- Never bypass RLS
- Never expose private data

Allowed boundaries:
- Browser Supabase client: login, signup, client-side UI interactions
- Server Supabase client: server components, route handlers, server actions

## 4. Current Security State (Source of Truth)
These items are already completed and must not be undone:
- RLS is enabled on public."Users"
- row security is enabled
- dangerous public read access policy was removed
- authenticated users can read only their own profile
- condition: lower(email) = lower(auth.jwt() ->> 'email')
- anonymous users cannot read any profile
- dashboard uses server-side authentication
- logout uses a server action
- home page does not expose the Users table
- /auth/me shows only safe fields
- login/signup include validation and loading states
- no shared hardcoded passwords
- npm run lint passes
- npm run build passes

These protections must remain intact.

## 5. Database Rules
- public.members does not exist
- do not create members table, columns, migrations, or members RLS until the user explicitly approves the schema
- before modifying /members, ask:
  1. Should each user see only themselves?
  2. Should all authenticated members see the member list?
  3. Should only admins see the member list?
- admin role must not be implemented until storage location and verification method are approved

## 6. Authentication Rules
Signup requirements:
- full_name
- email
- password
- full_name stored in Auth metadata
- Supabase trigger creates the Users row automatically
- no client-side upsert into Users

Dashboard requirements:
- Server Component
- SSR authentication
- redirect unauthenticated users
- load protected data server-side

Logout requirements:
- server action
- invalidate session
- redirect to /auth/login

## 7. Approved Features
Allowed:
- automatic profile creation
- full_name sync
- optional profile picture upload
- contribution tracking (future)
- payout rotation logic (future)
- cycle schedule (future)
- group financial summary (future)
- admin role (future, pending approval)
- clean, minimal dashboard layout

Not allowed:
- feature creep
- redesign work
- platform-level complexity
- messaging
- notifications
- analytics dashboards
- multi-tenant systems
- public pages
- unnecessary abstractions

## 8. Working Method
Before changing code, explain:
1. what was found
2. why it matters
3. the proposed solution
4. the files that would change
5. expected behavior
6. how it will be tested

Ask for confirmation if the change involves:
- database schema
- RLS policies
- admin roles
- financial rules
- payout logic
- contribution logic
- major UI redesign
- new dependencies
- authentication architecture

For safe local fixes:
- explain
- implement
- run npm run lint
- run npm run build
- run tests
- report results
- review diff

## 9. Security Requirements
Never:
- expose service-role keys
- commit .env.local
- display full Supabase identity objects
- expose private user data
- use select("*")
- rely only on client-side checks
- weaken RLS
- create broad public policies
- invent database structure
- add unnecessary features
- make unrelated refactors

## 10. Response Format
Use this response format for each improvement:
- Finding
- Reason
- Proposed Solution
- Files Affected
- Expected Behavior
- Verification

## 11. Final Identity Statement
BondFin Collective is a digital rotating savings group (ROSCA) built for a trusted circle of 10 members, where each member contributes $100 every two weeks and receives a payout in a rotating cycle. The application provides secure authentication, protected dashboards, strict RLS, automatic profile creation, and financial rotation tracking. All development must support this purpose and remain within this scope.

## 12. Final Operating Rule
No scope drift. No feature inflation. No security weakening. No unapproved schema changes. Keep BondFin focused on the ROSCA model and the trusted member group workflow.
