# BondFin Collective — Security Playbook

## Security Principles
BondFin must remain simple, private, secure, and focused on the ROSCA process.

## Architecture Security Rules
- Use Next.js App Router
- Use React
- Use Supabase Auth
- Use Supabase Database
- Use Supabase Storage
- Use Supabase Row Level Security
- Use @supabase/ssr
- Use Server Components for protected pages
- Use Client Components only for login, signup, and browser-only interactions

### Strict prohibitions
- Never switch to the Pages Router
- Never weaken SSR authentication
- Never import a server Supabase client into a client component
- Never import next/headers into a client component
- Never bypass RLS
- Never expose private data

## Current Security State (Source of Truth)
These are already completed and must not be undone:
- RLS enabled on public."Users"
- row security is enabled
- dangerous public read access policy removed
- authenticated users can read only their own profile
- condition: lower(email) = lower(auth.jwt() ->> 'email')
- anonymous users cannot read any profile
- dashboard uses server-side authentication
- logout uses a server action
- home page no longer exposes the Users table
- /auth/me shows only safe fields
- RLS is enabled on Contributions, PayoutSchedule, and Transactions
- ROSCA ownership uses auth.users UUIDs rather than email columns
- authenticated users can read only their own ROSCA records
- no client insert, update, or delete policies exist for financial records
- login/signup have validation and loading states
- no shared hardcoded passwords
- authenticated members may view names and profile pictures through the restricted MemberDirectory view
- member emails and financial records remain private
- npm run lint passes
- npm run build passes

## Database Rules
- public.members does not exist
- do not create members table, columns, migrations, or members RLS until the user approves the schema
- before modifying /members, ask about visibility and admin rules
- admin role must not be implemented until storage and verification methods are approved

## Security Requirements
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
- add unrelated features
- make unrelated refactors

## Final Rule
No scope drift. No security weakening. No unapproved schema changes.
