# BondFin Collective — Architecture Notes

## Stack
- Next.js App Router
- React
- Supabase Auth
- Supabase Database
- Supabase Storage
- @supabase/ssr

## Client/Server Boundary
### Client Supabase Client
Use only in:
- login pages
- signup pages
- browser UI interactions

### Server Supabase Client
Use only in:
- app/**/page.jsx
- app/**/route.js
- server actions

## Important Boundary Rules
- Never mix server-only APIs into client components
- Never use server Supabase clients in client pages
- Keep protected pages server-rendered and authenticated

## Security Model
- RLS controls access to protected tables
- auth is enforced server-side
- user data stays private
- no broad public access is allowed
