# BondFin Collective - ROSCA Schema and Security Report

**Status:** Schema secured, RLS enforced, member dashboard features 1-4 implemented where permitted  
**Date:** 2026-09-23  
**Migration:** `supabase/migrations/202609230001_secure_rosca_tables.sql`

## Finding

The original ROSCA tables stored ownership with email addresses and did not have complete row-level security. That made ownership dependent on mutable profile data and left financial table access broader than intended.

The three ROSCA tables were empty when the migration was applied, so the schema could be corrected in place without migrating financial records.

## Implemented Schema

### Contributions

- `user_id uuid not null references auth.users(id)` identifies the authenticated owner.
- `cycle_number integer not null` identifies the ROSCA cycle and must be greater than zero.
- `amount numeric(12,2) not null` must be greater than zero.
- `created_at timestamptz not null default now()` records creation time.
- `unique (user_id, cycle_number)` permits one contribution per member per cycle.
- The legacy `email` column was removed.

### PayoutSchedule

- `recipient_user_id uuid not null references auth.users(id)` identifies the payout recipient.
- `round_number` must be greater than zero.
- `created_at` is required and defaults to the current time.
- The legacy `recipient_email` column was removed.
- `group_id` remains nullable because no Groups table or group ownership model has been approved.

### Transactions

- `user_id uuid not null references auth.users(id)` identifies the authenticated owner.
- `amount numeric(12,2) not null` must be greater than zero.
- `type` must contain a non-empty value.
- `created_at` is required and defaults to the current time.
- The legacy `email` column was removed.

## Access Model

RLS is enabled on all three ROSCA tables. Anonymous users have no access. Authenticated users have read access only when the row belongs to their Auth user ID, except for the single active-cycle payout recipient row:

- Contributions: `user_id = auth.uid()`
- PayoutSchedule: `recipient_user_id = auth.uid()`, plus the approved active-cycle round
- Transactions: `user_id = auth.uid()`

The broad `Allow authenticated read` policy on `PayoutSchedule` was removed because permissive RLS policies are combined with `OR`; leaving it in place would have exposed every payout row to every authenticated user.

No authenticated insert, update, or delete policies are granted on the financial tables. Financial records are created or changed only through trusted server-side operations.

## Indexes

The migration adds indexes for the protected dashboard access paths:

- `contributions_user_created_idx`
- `payout_schedule_recipient_idx`
- `transactions_user_created_idx`

## Verification Evidence

The Supabase SQL Editor confirmed:

- `Contributions.rowsecurity = true`
- `PayoutSchedule.rowsecurity = true`
- `Transactions.rowsecurity = true`
- `Contributions.user_id` exists and is required.
- `PayoutSchedule.recipient_user_id` exists and is required.
- `Transactions.user_id` exists and is required.
- The old email ownership columns are absent.
- Authenticated `SELECT` policies are limited to member-owned rows, plus the approved active-cycle recipient exception on `PayoutSchedule`.

The active-cycle recipient migration has been added to the repository but still needs to be applied and verified in Supabase.

Repository validation also passed:

- `npm run lint`
- `npm run build`

## Intended Application Behavior

Protected server-rendered pages should query ROSCA records by the authenticated user's UUID, never by email. The dashboard may display a member's own contribution, payout, and transaction records through the server Supabase client while RLS remains the final enforcement layer.

Members can read their own payout rows and, under the approved exception, the single active cycle's matching payout round. The migration `202610020001_active_cycle_recipient.sql` adds that narrow RLS policy and a no-argument function returning only the active recipient's display name. Other payout rounds remain private.

Member-reported payment data is stored separately from `Contributions` in `PaymentReports`. Members can read only their own report rows. The active recipient gets a narrowly scoped function returning the active cycle's report list; neither direct report writes nor direct confirmation writes are granted. Security-definer RPCs validate the active cycle and scheduled recipient, and atomically record a contribution only after receipt confirmation (or as retained for the cycle recipient). `PaymentReportEvents` is append-only through those RPCs; authenticated clients have no direct access to the event table.

## Dashboard Feature Readiness

### 1. Contribution Status - Implemented

The dashboard displays the authenticated member's latest contribution amount, cycle number, and contribution date. An empty state is shown when no contribution exists.

The current unique constraint means the implementation assumes one full contribution per member per cycle. Partial or multiple payments require a schema decision before changing the constraint.

### 2. Payout Rotation - Member View Implemented

The dashboard displays the authenticated member's payout round and scheduled date, plus the active cycle's single recipient. It does not display the full rotation or group-wide payout history. Recipient payment details are not listed in BondFin yet.

The scheduled recipient can review member reports for their active cycle and confirm receipt. Confirmed reports create the member's `Contributions` ledger row in the same transaction. A member's own contribution is recorded as retained by the recipient. Other reviewer roles are not implemented because the project does not yet have an approved role model.

### 3. Next Payout Date - Member View Implemented

The dashboard displays the member's next available payout date and a clear empty state when no payout is scheduled. A live countdown is not included yet; the current implementation renders the authoritative server-provided date.

### 4. Transactions - Member View Implemented

The dashboard displays up to five recent transactions for the authenticated member, including type, amount, and date. An empty state is shown when no transactions exist.

Group-wide totals and financial summaries remain unavailable until collective visibility and aggregation rules are approved.

## Remaining Decisions

These items are intentionally not implemented yet:

- Whether multiple payments or partial payments may occur within one cycle.
- Whether the full payout schedule should be visible to every authenticated collective member; only the active cycle recipient is currently exposed.
- The approved Groups or collective ownership model for `group_id`.
- Trusted workflows for financial writes beyond active-cycle member transfer reports and recipient confirmation.
- A controlled set of allowed transaction types.
- Whether a live client-side countdown is needed for payout dates.
