create table if not exists public."NotificationPreferences" (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payment_updates boolean not null default false,
  receipt_updates boolean not null default false,
  cycle_updates boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public."NotificationPreferences" enable row level security;
revoke all on table public."NotificationPreferences" from anon;
revoke all on table public."NotificationPreferences" from authenticated;
grant select, insert, update on table public."NotificationPreferences" to authenticated;

drop policy if exists "Members read own notification preferences" on public."NotificationPreferences";
create policy "Members read own notification preferences"
on public."NotificationPreferences"
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Members create own notification preferences" on public."NotificationPreferences";
create policy "Members create own notification preferences"
on public."NotificationPreferences"
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Members update own notification preferences" on public."NotificationPreferences";
create policy "Members update own notification preferences"
on public."NotificationPreferences"
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public."AccountDeletionRequests" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz not null default now()
);

create unique index if not exists account_deletion_one_open_request_idx
on public."AccountDeletionRequests" (user_id)
where status in ('pending', 'processing');

alter table public."AccountDeletionRequests" enable row level security;
revoke all on table public."AccountDeletionRequests" from anon;
revoke all on table public."AccountDeletionRequests" from authenticated;
grant select, insert on table public."AccountDeletionRequests" to authenticated;

drop policy if exists "Members read own account deletion requests" on public."AccountDeletionRequests";
create policy "Members read own account deletion requests"
on public."AccountDeletionRequests"
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Members request own account deletion" on public."AccountDeletionRequests";
create policy "Members request own account deletion"
on public."AccountDeletionRequests"
for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending');