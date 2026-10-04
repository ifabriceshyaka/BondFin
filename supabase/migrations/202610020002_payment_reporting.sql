-- Record member-reported transfers separately from confirmed contributions.
-- Only the scheduled recipient can confirm a transfer for the active cycle.

create table if not exists public."PaymentReports" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  cycle_number integer not null references public."Cycles"(cycle_number),
  amount numeric(12, 2) not null check (amount > 0),
  status text not null check (status in ('sent', 'received', 'retained')),
  sent_at timestamptz,
  received_at timestamptz,
  received_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id, cycle_number),
  check (
    (status = 'sent' and sent_at is not null and received_at is null and received_by is null)
    or (status = 'received' and sent_at is not null and received_at is not null and received_by is not null)
    or (status = 'retained' and sent_at is null and received_at is not null and received_by is not null)
  )
);

create table if not exists public."PaymentReportEvents" (
  id uuid primary key default gen_random_uuid(),
  payment_report_id uuid not null references public."PaymentReports"(id),
  event_type text not null check (event_type in ('sent', 'received', 'retained')),
  actor_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public."PaymentReports" enable row level security;
alter table public."PaymentReportEvents" enable row level security;

revoke all on table public."PaymentReports" from anon;
revoke all on table public."PaymentReports" from authenticated;
grant select on table public."PaymentReports" to authenticated;

revoke all on table public."PaymentReportEvents" from anon;
revoke all on table public."PaymentReportEvents" from authenticated;

drop policy if exists "Members read own payment reports"
on public."PaymentReports";

create policy "Members read own payment reports"
on public."PaymentReports"
for select
to authenticated
using (user_id = (select auth.uid()));

create index if not exists payment_reports_cycle_status_idx
on public."PaymentReports" (cycle_number, status, created_at);

create or replace function public.submit_active_cycle_contribution(
  p_cycle_number integer
)
returns table (
  payment_report_id uuid,
  payment_status text,
  reported_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipient_id uuid;
  v_cycle_amount numeric(12, 2);
  v_schedule_count bigint;
  v_report_id uuid;
  v_status text;
  v_created_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select cycle.contribution_amount
    into v_cycle_amount
  from public."Cycles" as cycle
  where cycle.cycle_number = p_cycle_number
    and cycle.status = 'active'
  for share;

  if not found then
    raise exception 'The requested cycle is not active';
  end if;

  select count(*)
    into v_schedule_count
  from public."PayoutSchedule" as payout
  where payout.round_number = p_cycle_number;

  if v_schedule_count <> 1 then
    raise exception 'This cycle does not have exactly one scheduled recipient';
  end if;

  select payout.recipient_user_id
    into v_recipient_id
  from public."PayoutSchedule" as payout
  where payout.round_number = p_cycle_number;

  select report.id, report.status, report.created_at
    into v_report_id, v_status, v_created_at
  from public."PaymentReports" as report
  where report.user_id = v_user_id
    and report.cycle_number = p_cycle_number
  for update;

  if found then
    return query select v_report_id, v_status, v_created_at;
    return;
  end if;

  if exists (
    select 1
    from public."Contributions" as contribution
    where contribution.user_id = v_user_id
      and contribution.cycle_number = p_cycle_number
  ) then
    raise exception 'A contribution is already recorded for this cycle';
  end if;

  if v_user_id = v_recipient_id then
    insert into public."PaymentReports" (
      user_id,
      cycle_number,
      amount,
      status,
      received_at,
      received_by
    )
    values (
      v_user_id,
      p_cycle_number,
      v_cycle_amount,
      'retained',
      now(),
      v_user_id
    )
    on conflict (user_id, cycle_number) do nothing
    returning id, status, created_at
      into v_report_id, v_status, v_created_at;
  else
    insert into public."PaymentReports" (
      user_id,
      cycle_number,
      amount,
      status,
      sent_at
    )
    values (
      v_user_id,
      p_cycle_number,
      v_cycle_amount,
      'sent',
      now()
    )
    on conflict (user_id, cycle_number) do nothing
    returning id, status, created_at
      into v_report_id, v_status, v_created_at;
  end if;

  if not found then
    select report.id, report.status, report.created_at
      into v_report_id, v_status, v_created_at
    from public."PaymentReports" as report
    where report.user_id = v_user_id
      and report.cycle_number = p_cycle_number;

    return query select v_report_id, v_status, v_created_at;
    return;
  end if;

  if v_status = 'retained' then
    insert into public."Contributions" (user_id, cycle_number, amount)
    values (v_user_id, p_cycle_number, v_cycle_amount);

    insert into public."PaymentReportEvents" (
      payment_report_id,
      event_type,
      actor_user_id
    )
    values (v_report_id, 'retained', v_user_id);
  else
    insert into public."PaymentReportEvents" (
      payment_report_id,
      event_type,
      actor_user_id
    )
    values (v_report_id, 'sent', v_user_id);
  end if;

  return query select v_report_id, v_status, v_created_at;
end;
$$;

create or replace function public.get_active_cycle_payment_reports()
returns table (
  report_id uuid,
  contributor_name text,
  amount numeric,
  status text,
  sent_at timestamptz,
  received_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    report.id,
    coalesce(
      case
        when profile.full_name ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
          then null
        else nullif(btrim(profile.full_name), '')
      end,
      nullif(btrim(contributor.raw_user_meta_data ->> 'full_name'), ''),
      'Member'
    )::text,
    report.amount,
    report.status,
    report.sent_at,
    report.received_at
  from public."PaymentReports" as report
  join public."Cycles" as cycle
    on cycle.cycle_number = report.cycle_number
   and cycle.status = 'active'
  join public."PayoutSchedule" as payout
    on payout.round_number = cycle.cycle_number
   and payout.recipient_user_id = (select auth.uid())
  join auth.users as contributor
    on contributor.id = report.user_id
  left join lateral (
    select user_profile.full_name
    from public."Users" as user_profile
    where lower(user_profile.email) = lower(contributor.email)
    order by user_profile.id
    limit 1
  ) as profile on true
  where (
    select count(*)
    from public."PayoutSchedule" as cycle_payout
    where cycle_payout.round_number = cycle.cycle_number
  ) = 1
  order by report.created_at desc
  limit 30;
$$;

create or replace function public.confirm_cycle_payment_received(
  p_report_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_user_id uuid;
  v_cycle_number integer;
  v_amount numeric(12, 2);
  v_inserted_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select report.user_id, report.cycle_number, report.amount
    into v_report_user_id, v_cycle_number, v_amount
  from public."PaymentReports" as report
  join public."Cycles" as cycle
    on cycle.cycle_number = report.cycle_number
   and cycle.status = 'active'
  join public."PayoutSchedule" as payout
    on payout.round_number = cycle.cycle_number
   and payout.recipient_user_id = v_user_id
  where report.id = p_report_id
    and report.status = 'sent'
    and (
      select count(*)
      from public."PayoutSchedule" as cycle_payout
      where cycle_payout.round_number = cycle.cycle_number
    ) = 1
  for update of report, cycle, payout;

  if not found then
    raise exception 'This sent report is unavailable or already processed';
  end if;

  if v_report_user_id = v_user_id then
    raise exception 'A member cannot confirm their own transfer';
  end if;

  insert into public."Contributions" (user_id, cycle_number, amount)
  values (v_report_user_id, v_cycle_number, v_amount)
  on conflict (user_id, cycle_number) do nothing;

  get diagnostics v_inserted_count = row_count;
  if v_inserted_count <> 1 then
    raise exception 'A contribution is already recorded for this cycle';
  end if;

  update public."PaymentReports"
  set status = 'received',
      received_at = now(),
      received_by = v_user_id
  where id = p_report_id;

  insert into public."PaymentReportEvents" (
    payment_report_id,
    event_type,
    actor_user_id
  )
  values (p_report_id, 'received', v_user_id);
end;
$$;

revoke all on function public.submit_active_cycle_contribution(integer)
from public, anon;
revoke all on function public.get_active_cycle_payment_reports()
from public, anon;
revoke all on function public.confirm_cycle_payment_received(uuid)
from public, anon;

grant execute on function public.submit_active_cycle_contribution(integer)
to authenticated;
grant execute on function public.get_active_cycle_payment_reports()
to authenticated;
grant execute on function public.confirm_cycle_payment_received(uuid)
to authenticated;

notify pgrst, 'reload schema';
