-- Define the active ROSCA cycle used by member dashboards.
-- Cycle administration is intentionally server/admin-only for now.

create table if not exists public."Cycles" (
  id uuid primary key default gen_random_uuid(),
  cycle_number integer not null unique check (cycle_number > 0),
  start_date date not null,
  due_date date not null,
  contribution_amount numeric(12, 2) not null check (contribution_amount > 0),
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed')),
  created_at timestamptz not null default now(),
  check (due_date >= start_date)
);

alter table public."Cycles" enable row level security;

revoke all on table public."Cycles" from anon;
revoke all on table public."Cycles" from authenticated;
grant select on table public."Cycles" to authenticated;

drop policy if exists "Authenticated users can read cycles" on public."Cycles";

create policy "Authenticated users can read cycles"
on public."Cycles"
for select
to authenticated
using (true);

create index if not exists cycles_status_due_date_idx
on public."Cycles" (status, due_date);

create unique index if not exists cycles_one_active_idx
on public."Cycles" (status)
where status = 'active';
