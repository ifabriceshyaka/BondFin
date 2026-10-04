# BondFin Collective - Dashboard Feature Documentation

**Status:** Implemented  
**Date:** 2026-09-23  
**Route:** `/dashboard`  
**Implementation:** `app/dashboard/page.jsx`

## BondFin Terminology

Member-facing screens call each numbered cycle an **URUZIGA** followed by its number, such as `URUZIGA-1`. “Uruziga” is the BondFin Collective term for the recurring contribution and payout round. Database tables and fields (`Cycles`, `cycle_number`, and related payment references), Supabase RPC names, URLs, and stored values remain unchanged; the display label is formatted from the existing numeric cycle number.

## Purpose

The dashboard is a protected, server-rendered member view for BondFin Collective. It shows the signed-in member's own contribution, payout, and transaction information, plus the active Uruziga's designated recipient. Members can use the horizontally scrollable URUZIGA cards to browse their own contribution and date-window transaction history in other Uruziga rounds; choosing a card navigates directly to that round. A selected historical Uruziga is marked separately from the active one. Payment reporting and confirmation, recipient names, and transfer details remain available only for the active Uruziga. The dashboard does not expose other members' contributions, transactions, or the full payout rotation.

Under the agreed ROSCA flow, members pay the scheduled recipient directly through an external provider such as Zelle or Cash App. With ten $100 member contributions, the other nine members transfer $900 to the recipient; the recipient retains their own $100 contribution. Provider transfers are not automatically verified by the current app.

Unauthenticated visitors are redirected to `/auth/login`.

## Authentication and Data Access

The dashboard uses the server Supabase client and validates the current session with `supabase.auth.getUser()` before loading protected data.

Member-owned ROSCA queries are scoped to the authenticated Supabase Auth user ID:

- `Contributions.user_id = user.id`
- `PayoutSchedule.recipient_user_id = user.id`
- `Transactions.user_id = user.id`

RLS remains the final security boundary. The dashboard does not use email addresses to query financial records and does not use `select("*")`. The active cycle recipient is the only exception to the member-owned payout read: a narrow RLS policy exposes rows for the active cycle's matching payout round, and a no-argument security-definer function returns only that cycle number and recipient display name. The function joins the recipient's Auth email to `Users` because those tables use different IDs; it does not expose email addresses or other payout rounds.

## Dashboard Sections

### My Contributions

The protected `/contributions` route shows the signed-in member's contribution records, newest first. Each row displays the URUZIGA label, recorded date, and recorded amount. The query filters by the authenticated user's UUID; the page is read-only and does not allow members to submit or edit financial records.

### Member Header

Displays:

- Member name from the `Users` profile or Auth metadata
- Member email from the profile or authenticated account
- Sign-out action through a server action

### Contribution Status

Displays the signed-in member's contribution record for the active Uruziga:

- The amount when a contribution row exists.
- `Not recorded` when no contribution row exists.
- The recorded date

The contribution ledger row is shown as received. A member-reported transfer is kept separately and is not treated as received until the designated recipient confirms it.

By default, the dashboard selects the single `active` row in `public."Cycles"`. The URUZIGA cards link directly to the existing `cycle` query parameter for read-only history; an invalid or unknown value falls back to the active Uruziga. The selected card and active status are shown independently, so browsing a completed Uruziga does not obscure which one is active. On mobile, the cards scroll horizontally. The dashboard compares the member's contribution by `cycle_number` and displays that Uruziga's configured due date and contribution amount. If no active Uruziga exists, it displays the latest available round or `No active Uruziga` if the table is empty. Transfer reporting and confirmation server actions still require the active Uruziga.

The migration `supabase/migrations/202609240004_cycles.sql` creates the cycle table, enables authenticated read-only access, and prevents more than one active cycle. Cycle creation and status changes remain administrative operations and are not available to browser clients.

### Active Uruziga Recipient and Due Date

The dashboard prominently shows the active Uruziga's recipient, contribution amount, and due date. BondFin uses the approved mapping `PayoutSchedule.round_number = Cycles.cycle_number`. If no payout row exists, the recipient is shown as not scheduled; if more than one row matches, the dashboard reports a schedule issue instead of choosing one arbitrarily. The scheduled recipient can publish Zelle and Cash App details in Settings; members see those details for the active Uruziga.

The migration `supabase/migrations/202610020001_active_cycle_recipient.sql` adds an authenticated read policy limited to the active cycle's payout round and the `get_active_cycle_recipient()` function. The function returns only the active cycle number and recipient display name; it does not reveal the full payout rotation. Apply this migration in Supabase before expecting recipient names to appear.

Apply `202610020001_active_cycle_recipient.sql`, `202610020002_payment_reporting.sql`, and `202610030001_payment_hardening.sql` in the Supabase SQL Editor before using the full recipient and payment workflow. Members report the cycle's fixed contribution amount as sent, including a transfer method and reference. This creates a `PaymentReports` row with status `sent`, but does not create a `Contributions` row. Only the uniquely scheduled recipient for the active cycle can confirm that report; confirmation and the corresponding `Contributions` insert happen atomically. An append-only `PaymentReportEvents` row records who reported, withdrew, rejected, or confirmed and when. The recipient's own contribution is recorded as `retained`, with the matching contribution ledger row, rather than asking them to transfer money to themselves.

There is no authorized-reviewer role in the current schema, so confirmation and rejection are limited to the scheduled recipient. Adding other reviewers must wait for an approved role model and corresponding authorization policies. New reports and confirmations are restricted to the active cycle. A sender can withdraw a report while it is still sent; the recipient can reject a transfer they did not receive, after which the member can report again. The member's Contributions page combines contribution-ledger records with their own payment reports and clearly distinguishes received, awaiting confirmation, rejected, and withdrawn states. Manual transfers do not yet have downloadable receipts or invoices.

The payment workflow database test is [`payment_reporting.integration.sql`](../../supabase/tests/payment_reporting.integration.sql). Run it with `psql "$TEST_DATABASE_URL" -f supabase/tests/payment_reporting.integration.sql` against a disposable, empty PostgreSQL database. It applies the relevant migrations and rolls all test data back; do not point it at production or a database containing application data.

To configure a test cycle in Supabase SQL Editor:

```sql
insert into public."Cycles"
	(cycle_number, start_date, due_date, contribution_amount, status)
values
	(1, current_date, current_date + 14, 100.00, 'active');
```

The dashboard displays a contribution as received only when the `Contributions` ledger row exists. A `sent` report is labelled as awaiting confirmation and is never presented as received.

The current database constraint allows one contribution per member per cycle. Partial or multiple payments require an explicit schema decision before changing that constraint.

### Your Payout Round

Displays the signed-in member's earliest upcoming or available payout schedule row:

- Round number
- Payout date

If no payout schedule row exists, the dashboard displays `No payout scheduled yet.`

### Next Payout Date

Displays the same member-specific payout date in a dedicated summary card. If no date exists, it displays `Not scheduled`.

The current implementation displays the authoritative server-provided date. It does not yet include a live client-side countdown.

### Recent Transactions

Displays up to five recent transactions belonging to the signed-in member:

- Transaction type
- Amount formatted in USD
- Transaction date

If no transactions exist, the dashboard displays `No transactions recorded yet.`

### Group Summary

The card currently explains that group summary data is unavailable until collective visibility rules are approved.

It does not display group totals, other members' contributions, or full payout rotation data. The only cross-member financial visibility is the approved active-cycle recipient assignment.

## Loading and Error Behavior

The page is a server component, so data is loaded before the dashboard is rendered. Query errors are logged on the server and the affected section falls back to its empty or unavailable state rather than exposing raw database errors to the user.

## Security Requirements

Future dashboard changes must preserve these rules:

- Keep the page server-rendered.
- Query with the authenticated user's UUID.
- Preserve the existing RLS policies, including the approved active-cycle recipient exception.
- Do not add broad authenticated read policies; the active-cycle recipient exception is narrowly scoped and approved.
- Do not expose service-role credentials in dashboard code.
- Do not add direct financial writes from the browser.
- Keep group-wide summaries disabled until the group ownership and visibility model is approved.

## Future Decisions

The following are intentionally outside the current dashboard implementation:

- Full payout rotation visibility
- Group-wide contribution or transaction totals
- Live payout countdown behavior
- Partial or multiple payments per cycle
- Trusted workflow for creating and updating financial records
- Admin-only financial views

## Profile Management

The protected `/profile` route is implemented as the first member-owned profile feature.

Members can:

- View their current full name.
- Update their own full name.
- View their email address as read-only.

The update uses a server action and the server Supabase client. It updates only `full_name`; email, profile ownership, and financial records are not editable from this page.

The migration `supabase/migrations/202609240001_profile_updates.sql` grants authenticated users update permission only for `full_name` and `profile_picture`, then adds an RLS policy matching the signed-in email to the profile row. The profile-picture permission is reserved for the future Storage-backed avatar flow.

The same migration creates a private `avatars` Storage bucket and policies that allow authenticated members to read avatars and manage files only inside their own Auth UUID folder. Profile pages and the Members directory use one-hour signed URLs; the database stores only the object path.

To enable profile updates and avatars in Supabase, run `supabase/migrations/202609240001_profile_updates.sql` once in the SQL Editor. Then visit `/profile` while signed in, change the name or choose a JPG, PNG, or WebP image up to 2 MB, and select **Save profile**. A successful update redirects to `/profile?saved=1`; invalid names, invalid files, and database or upload failures return user-safe messages.

## Members Page

The `/members` route is a protected directory for authenticated members. It reads from the `MemberDirectory` view rather than directly from `Users`.

The view exposes only:

- `id`
- `full_name`
- `profile_picture`

Email addresses and financial records are not exposed by this directory. The underlying `Users` table and its existing private profile policy remain unchanged.

The page displays member names and profile pictures, with an initial-based fallback when no picture is available. It does not display contribution amounts, payout details, transaction history, or email addresses.

## Deferred Dashboard Follow-ups

Remaining dashboard follow-ups should be handled one at a time after the relevant data is verified and the display decision is clear.

- [x] Confirm `PayoutSchedule.round_number` maps to `Cycles.cycle_number`; expose only the active cycle recipient to members.
- [ ] TODO: Check that the member list excludes the signed-in member.
	- Verify how `MemberDirectory.id` maps to the Auth user ID. It comes from `Users.id`, which may differ from `auth.users.id`.
	- Only then adjust the exclusion logic; the current comparison may include the signed-in member or show fewer peers than intended.
- [ ] TODO: Decide which payout belongs on the dashboard.
	- Check whether `PayoutSchedule` retains past payout rows.
	- If it does, decide whether to show the next future payout or payout history before changing the query, which currently selects the earliest date overall.

Automated provider confirmation, reminders, countdowns, recipient payment details, and additional authorized reviewers remain follow-ups. A “sent” report alone never creates a confirmed contribution.
