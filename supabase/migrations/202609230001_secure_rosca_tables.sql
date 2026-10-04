-- Secure the existing empty ROSCA tables.
-- Users remains the profile table and continues to use its existing email-based RLS.

-- Contributions
alter table public."Contributions"
  add column user_id uuid references auth.users(id),
  add column cycle_number integer not null default 1;

alter table public."Contributions"
  alter column amount type numeric(12, 2),
  alter column created_at set default now(),
  alter column created_at set not null;

alter table public."Contributions"
  alter column user_id set not null,
  add constraint contributions_cycle_check check (cycle_number > 0),
  add constraint contributions_amount_check check (amount > 0),
  add constraint contributions_unique_cycle unique (user_id, cycle_number);

alter table public."Contributions"
  drop column email;

alter table public."Contributions" enable row level security;

revoke all on table public."Contributions" from anon;
revoke all on table public."Contributions" from authenticated;
grant select on table public."Contributions" to authenticated;

create policy "Users read own contributions"
on public."Contributions"
for select
to authenticated
using (user_id = auth.uid());

create index contributions_user_created_idx
on public."Contributions" (user_id, created_at desc);

-- Payout schedule
alter table public."PayoutSchedule"
  add column recipient_user_id uuid references auth.users(id),
  add constraint payout_schedule_round_check check (round_number > 0);

alter table public."PayoutSchedule"
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column recipient_user_id set not null;

alter table public."PayoutSchedule"
  drop column recipient_email;

alter table public."PayoutSchedule" enable row level security;

revoke all on table public."PayoutSchedule" from anon;
revoke all on table public."PayoutSchedule" from authenticated;
grant select on table public."PayoutSchedule" to authenticated;

drop policy if exists "Allow authenticated read" on public."PayoutSchedule";

create policy "Users read their payout schedule rows"
on public."PayoutSchedule"
for select
to authenticated
using (recipient_user_id = auth.uid());

create index payout_schedule_recipient_idx
on public."PayoutSchedule" (recipient_user_id, payout_date);

-- Transactions
alter table public."Transactions"
  add column user_id uuid references auth.users(id);

alter table public."Transactions"
  alter column amount type numeric(12, 2),
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column user_id set not null,
  add constraint transactions_amount_check check (amount > 0),
  add constraint transactions_type_check check (length(trim(type)) > 0);

alter table public."Transactions"
  drop column email;

alter table public."Transactions" enable row level security;

revoke all on table public."Transactions" from anon;
revoke all on table public."Transactions" from authenticated;
grant select on table public."Transactions" to authenticated;

create policy "Users read own transactions"
on public."Transactions"
for select
to authenticated
using (user_id = auth.uid());

create index transactions_user_created_idx
on public."Transactions" (user_id, created_at desc);