<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BondFin project rules

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) first. It is the canonical source for the ROSCA model, architecture rules, security state, and working method. If other docs conflict with it, follow `PROJECT_CONTEXT.md`.

## Ask before changing

Database schema, RLS policies, admin roles, financial or payout rules, new dependencies, authentication architecture, or major UI redesigns.

## Hard rules

- Never expose or commit `.env.local` or `SUPABASE_SERVICE_ROLE_KEY`.
- Never weaken RLS or SSR authentication.
- Writes go through the existing security definer RPCs, not direct table writes.
- Do not use `select("*")`.

## Required verification

Run before reporting work as done:

```bash
npm run lint
npm run build
```

For database or RLS changes, also run the scripts in `supabase/` (`verify_rls.sql`, `tests/payment_reporting.integration.sql`) against staging only, never production.
