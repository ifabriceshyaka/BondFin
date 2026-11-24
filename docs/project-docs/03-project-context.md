# BondFin Collective — Project Context

## Identity
BondFin Collective is a private rotating savings group (ROSCA) for 10 trusted members.

## Purpose
- Each member contributes $100 every two weeks
- Member contribution obligations total $1,000 per cycle
- Members pay the cycle's recipient directly; the other nine members transfer $900 total, while the recipient retains their own $100 contribution
- One member receives the direct payments each cycle
- Rotation continues until all 10 members receive payout
- The app tracks contributions, payout order, payout dates, cycle status, and financial transparency

## Architecture
Use:
- Next.js App Router
- React
- Supabase Auth
- Supabase Database
- Supabase Storage
- Supabase RLS
- @supabase/ssr
- Server Components for protected pages
- Client Components only for login, signup, or browser-only UI

## Guardrails
- Do not switch to Pages Router
- Do not weaken SSR auth
- Do not import server Supabase client into client code
- Do not bypass RLS
- Do not expose private data
- Keep all work aligned with the ROSCA model

## Final Statement
BondFin Collective is a secure digital rotating savings group for a trusted circle of 10 members. All engineering decisions must support this purpose and remain within the defined scope.
