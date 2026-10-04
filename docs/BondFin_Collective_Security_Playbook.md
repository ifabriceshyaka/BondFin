# BondFin Collective Security Playbook

## 1. Project Identity and Purpose

BondFin Collective is a private rotating savings group (ROSCA) for 10 trusted members.

BondFin is not:

- a social network
- a public platform
- a messaging app
- an analytics dashboard
- a SaaS product
- a multi-tenant system

BondFin is a simple, secure, private financial collective with one purpose:

### ROSCA Model

- Each member contributes $100 every two weeks
- The group pools $1,000
- One member receives the payout per cycle
- Rotation continues until all 10 members receive their payout
- The app tracks members, contributions, payout order, payout dates, cycle status, and financial transparency

All development must support this model.

---

## 2. Architecture Rules (Strict)

BondFin uses:

- Next.js App Router (16.x)
- React
- Supabase Auth
- Supabase Database
- Supabase Storage
- Supabase Row Level Security (RLS)
- @supabase/ssr
- Server Components for protected pages
- Client Components only for login/signup or true browser interactions

### Never do the following

- Never switch to the Pages Router
- Never weaken SSR authentication
- Never import a server Supabase client into client components
- Never import next/headers into client components
- Never bypass RLS
- Never expose private data

### Allowed boundaries

Use the browser Supabase client only in:

- login
- signup
- client-side UI interactions

Use the server Supabase client only in:

- server components
- route handlers
- server actions

---

## 3. Current Security State (Source of Truth)

These items are already completed and must not be undone:

- RLS enabled on public."Users"
- row security is enabled
- dangerous public read access policy removed
- current policy: authenticated users can read their own profile
- condition: lower(email) = lower(auth.jwt() ->> 'email')
- anonymous users cannot read any profile
- authenticated users can only read their own profile
- no admin bypass exists yet
- dashboard uses server-side authentication
- logout uses server action
- home page no longer exposes the Users table
- /auth/me shows only safe fields
- login/signup have validation and loading states
- no shared hardcoded passwords
- npm run lint passes
- npm run build passes

These rules must remain intact.

---

## 4. Database Rules

### Important

public.members does not exist.

Do not create:

- members table
- members columns
- members migrations
- members RLS

until the user explicitly approves the schema.

Before modifying /members, Luna must ask:

1. Should each user see only themselves?
2. Should all authenticated members see the member list?
3. Should only admins see the member list?

Admin role must not be implemented until:

- storage location is approved
- verification method is approved

---

## 5. Authentication Rules

### Signup

- full_name
- email
- password
- full_name stored in Auth metadata
- Supabase trigger creates Users row automatically
- no client-side upsert into Users

### Dashboard

- Server Component
- SSR authentication
- redirect unauthenticated users
- load protected data server-side
- cycle selector reads only cycle metadata from public."Cycles"
- contribution reads must filter by both authenticated `user.id` and selected `cycle_number`
- payout reads must filter by authenticated `user.id` (`recipient_user_id`) and selected `round_number`
- transaction reads must always filter by authenticated `user.id`; current cycle view additionally bounds `created_at` to the selected cycle start and due dates
- transactions do not currently have a cycle foreign key; date-window inclusion is a display filter, not proof of a financial cycle relationship
- never calculate or display group-wide totals, balances, member comparisons, or full payout rotation in the member dashboard
- do not rely on a cycle selector or query parameter for authorization; RLS and owner filters remain mandatory

### Logout

- server action
- invalidates session
- redirects to /auth/login

---

## 6. Supabase Client Boundary

### Server Supabase Client

Use only in:

- app/\*\*/page.jsx
- app/\*\*/route.js
- server actions

### Client Supabase Client

Use only in:

- login page
- signup page
- client components

Never mix server-only APIs in client components.
Never import a server client into client pages.

---

## 7. Approved BondFin Features

Luna and Copilot may work on:

- automatic profile creation
- full_name sync
- optional profile picture upload
- contribution tracking (future)
- payout rotation logic (future)
- cycle schedule (future)
- group financial summary (future)
- admin role (future, pending approval)
- clean, minimal dashboard layout

### Member Cycle Overview

- Members may select from existing cycle metadata and view their own cycle contribution and payout-round information.
- Contributions are selected by `user_id = auth.uid()` and the chosen `cycle_number`.
- Payout rows are selected by `recipient_user_id = auth.uid()` and the chosen `round_number`.
- The approved active-cycle recipient display may read only the payout row whose `round_number` matches the active cycle. The `get_active_cycle_recipient()` function returns that recipient's display name without exposing other payout rounds or email addresses.
- The current Transactions schema has no cycle identifier. The dashboard may show the signed-in member's transactions whose timestamps fall within the chosen cycle's inclusive start/due date window, but must label this as a date-window filter and must not infer a cycle foreign-key relationship.
- Cycle metadata is readable by authenticated members; cycle creation and status changes remain trusted administrative operations.
- No group aggregates are authorized by this feature. Any collective overview requires a separately approved role and access design before implementation.

### Admin Dashboard Prototype (Approved, Non-Production)

- A data-free visual prototype at `/admin` is approved for local development only.
- The prototype requires a valid signed-in Supabase session, but it does not perform an admin-role check because no admin role has been approved or implemented.
- The route must return not-found outside development (`NODE_ENV !== "development"`).
- The prototype must not query financial, member-directory, profile, or role tables. All displayed names, cycles, statuses, references, and queues must be clearly synthetic placeholders.
- All write and review controls must remain disabled. Do not implement contribution verification, payout editing, cycle publishing, late-payment approval, exports, or audit mutations in this prototype.
- Prominent page copy must say the prototype is not an admin console, is visible to any signed-in user in development, and contains no real financial data.
- Do not add admin navigation to the production member dashboard until the admin identity and authorization model is approved.
- The prototype is not evidence of authorization and must not be promoted to production unchanged.

### Admin System: Approval Gates Before Live Wiring

Before introducing live admin data or financial operations, explicitly approve and document:

1. Admin identity storage, manual bootstrap, removal, and recovery procedures. `UserRoles` is a proposal, not current schema.
2. The exact RLS policies that allow admins to read broader financial data, plus tests proving ordinary members remain restricted to their own rows.
3. Whether late-payment exceptions require a second approver and how approval identity is verified.
4. Whether `round_number` is guaranteed to map to `Cycles.cycle_number` — approved: they match.
5. For financial mutations beyond member transfer reporting and recipient confirmation, define a trusted server/RPC workflow. Never infer legacy transaction assignments from timestamps; old rows remain unassigned until manually verified.
6. The member payment flow uses `PaymentReportEvents` as an append-only record of sent/received/retained events, with actor and timestamps. Additional financial changes still require append-only audit records, including affected record, previous/new values where appropriate, cycle assignment, and approval chain.
7. Server-side authorization, input validation, idempotency, and abuse/rate controls are required for every trusted write path. The shipped member payment RPCs validate the active cycle and uniquely scheduled recipient; only that recipient can confirm receipt until a reviewer role is approved.

Implement in this order after approval: role/bootstrap and RLS; negative/positive authorization tests; transaction-cycle schema and trusted audited workflow; then connect admin dashboard panels individually. Never rely on a hidden link, disabled button, or client-side role check for security.

Do not add:

- feature creep
- redesign work
- platform-level complexity

---

## 8. Design Philosophy

BondFin must remain:

- simple
- secure
- private
- professional
- predictable
- maintainable
- focused on the ROSCA model

Do not add:

- messaging
- notifications
- analytics dashboards
- complex admin panels
- multi-tenant systems
- public pages
- unnecessary abstractions

The development-only, authenticated, data-free admin dashboard prototype is an approved exception to the prohibition on complex admin panels. It must remain synthetic, disabled, and unavailable outside development until the admin system approval gates are complete.

---

## 9. Required Working Method (Luna and Copilot)

Before changing code:

1. Explain what you found
2. Explain why it matters
3. Explain the proposed solution
4. List the files that would change
5. Explain expected behavior
6. Explain how it will be tested
7. Ask for confirmation if the change involves:
   - database schema
   - RLS policies
   - admin roles
   - financial rules
   - payout logic
   - contribution logic
   - major UI redesign
   - new dependencies
   - authentication architecture

For safe, local fixes:

- explain
- implement
- run npm run lint
- run npm run build
- run tests
- report results
- review diff

---

## 10. Security Requirements

Never:

- expose service-role keys
- commit .env.local
- display full Supabase identity objects
- expose private user data
- use select("\*")
- rely only on client-side checks
- weaken RLS
- create broad public policies
- invent database structure
- add unnecessary features
- make unrelated refactors
- treat the development-only admin prototype's signed-in check as an admin authorization check
- query admin-wide financial rows before approved admin RLS and server authorization exist
- deploy the data-free admin prototype route to production
- infer cycle assignment for old transactions from timestamps

---

## 11. Response Format (Mandatory)

For each improvement, use this format:

### Finding

What is wrong or incomplete.

### Reason

Why it matters.

### Proposed Solution

Smallest correct fix.

### Files Affected

Exact files.

### Expected Behavior

What users or admins will see.

### Verification

Commands, SQL checks, and browser tests.

---

## 12. Final Identity Statement

BondFin Collective is a digital rotating savings group (ROSCA) built for a trusted circle of 10 members, where each member contributes $100 every two weeks and receives a payout in a rotating cycle. The application provides secure authentication, protected dashboards, strict RLS, automatic profile creation, and financial rotation tracking. All development must support this purpose and remain within this scope.

---

## Final Rule

BondFin must remain focused on its ROSCA purpose. No scope drift. No feature inflation. No security weakening. No unapproved schema changes.
