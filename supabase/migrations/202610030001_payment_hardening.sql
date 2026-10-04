-- Harden manual payment reporting:
--  * senders must name the transfer method and a reference when reporting
--  * senders can withdraw a mistaken report while it is still "sent"
--  * the scheduled recipient can reject a report they did not receive
--  * members can publish Zelle / Cash App details for the circle's recipient
-- "Sent" is still never treated as a confirmed payment.

alter table public."PaymentReports"
  add column if not exists payment_method text,
  add column if not exists transfer_reference text,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id);

-- Replace the original status/shape check (its generated name is not stable).
do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public."PaymentReports"'::regclass
      and contype = 'c'
      and conname not like '%payment_method%'
  loop
    execute format(
      'alter table public."PaymentReports" drop constraint %I',
      v_constraint.conname
    );
  end loop;
end;
$$;

alter table public."PaymentReports"
  add constraint payment_reports_amount_positive check (amount > 0),
  add constraint payment_reports_method_valid check (
    payment_method is null or payment_method in ('zelle', 'cash_app')
  ),
  add constraint payment_reports_reference_valid check (
    transfer_reference is null
    or char_length(transfer_reference) between 4 and 64
  ),
  add constraint payment_reports_status_shape check (
    (status = 'sent' and sent_at is not null and received_at is null
      and received_by is null and withdrawn_at is null and rejected_at is null)
    or (status = 'received' and sent_at is not null and received_at is not null
      and received_by is not null)
    or (status = 'retained' and sent_at is null and received_at is not null
      and received_by is not null)
    or (status = 'withdrawn' and sent_at is not null and withdrawn_at is not null
      and received_at is null and received_by is null)
    or (status = 'rejected' and sent_at is not null and rejected_at is not null
      and rejected_by is not null and received_at is null and received_by is null)
  );

alter table public."PaymentReports"
  drop constraint if exists "PaymentReports_status_check";
alter table public."PaymentReports"
  add constraint payment_reports_status_valid check (
    status in ('sent', 'received', 'retained', 'withdrawn', 'rejected')
  );

alter table public."PaymentReportEvents"
  drop constraint if exists "PaymentReportEvents_event_type_check";
alter table public."PaymentReportEvents"
  add constraint payment_report_events_type_valid check (
    event_type in ('sent', 'received', 'retained', 'withdrawn', 'rejected')
  );

-- Member-published payment details -------------------------------------------

create table if not exists public."MemberPaymentMethods" (
  user_id uuid primary key references auth.users(id) on delete cascade,
  zelle_contact text check (
    zelle_contact is null or char_length(zelle_contact) between 3 and 100
  ),
  cashapp_tag text check (
    cashapp_tag is null or cashapp_tag ~ '^\$[A-Za-z][A-Za-z0-9_]{0,19}$'
  ),
  updated_at timestamptz not null default now()
);

alter table public."MemberPaymentMethods" enable row level security;

revoke all on table public."MemberPaymentMethods" from anon;
revoke all on table public."MemberPaymentMethods" from authenticated;
grant select on table public."MemberPaymentMethods" to authenticated;

drop policy if exists "Members read own payment methods"
on public."MemberPaymentMethods";

create policy "Members read own payment methods"
on public."MemberPaymentMethods"
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.set_my_payment_methods(
  p_zelle_contact text,
  p_cashapp_tag text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_zelle text := nullif(btrim(p_zelle_contact), '');
  v_cashapp text := nullif(btrim(p_cashapp_tag), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_cashapp is not null and left(v_cashapp, 1) <> '$' then
    v_cashapp := '$' || v_cashapp;
  end if;

  if v_zelle is null and v_cashapp is null then
    delete from public."MemberPaymentMethods" where user_id = v_user_id;
    return;
  end if;

  insert into public."MemberPaymentMethods"
    (user_id, zelle_contact, cashapp_tag, updated_at)
  values (v_user_id, v_zelle, v_cashapp, now())
  on conflict (user_id) do update
    set zelle_contact = excluded.zelle_contact,
        cashapp_tag = excluded.cashapp_tag,
        updated_at = now();
end;
$$;

-- Only the active cycle's single scheduled recipient is exposed.
create or replace function public.get_active_cycle_recipient_payment_methods()
returns table (zelle_contact text, cashapp_tag text)
language sql
stable
security definer
set search_path = ''
as $$
  select method.zelle_contact, method.cashapp_tag
  from public."Cycles" as cycle
  join public."PayoutSchedule" as payout
    on payout.round_number = cycle.cycle_number
  join public."MemberPaymentMethods" as method
    on method.user_id = payout.recipient_user_id
  where cycle.status = 'active'
    and (select auth.uid()) is not null
    and (
      select count(*)
      from public."PayoutSchedule" as cycle_payout
      where cycle_payout.round_number = cycle.cycle_number
    ) = 1
  limit 1;
$$;

-- Reporting ---------------------------------------------------------------------

drop function if exists public.submit_active_cycle_contribution(integer);

create or replace function public.submit_active_cycle_contribution(
  p_cycle_number integer,
  p_payment_method text default null,
  p_transfer_reference text default null
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
  v_method text := nullif(btrim(p_payment_method), '');
  v_reference text := nullif(btrim(p_transfer_reference), '');
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

  if v_user_id <> v_recipient_id and (
    v_method is null
    or v_method not in ('zelle', 'cash_app')
    or v_reference is null
    or char_length(v_reference) not between 4 and 64
  ) then
    raise exception 'A transfer method and reference are required';
  end if;

  select report.id, report.status, report.created_at
    into v_report_id, v_status, v_created_at
  from public."PaymentReports" as report
  where report.user_id = v_user_id
    and report.cycle_number = p_cycle_number
  for update;

  if found then
    -- A withdrawn or rejected report may be filed again with new details.
    if v_status in ('withdrawn', 'rejected') and v_user_id <> v_recipient_id then
      update public."PaymentReports"
      set status = 'sent',
          sent_at = now(),
          payment_method = v_method,
          transfer_reference = v_reference,
          withdrawn_at = null,
          rejected_at = null,
          rejected_by = null
      where id = v_report_id
      returning status, sent_at into v_status, v_created_at;

      insert into public."PaymentReportEvents"
        (payment_report_id, event_type, actor_user_id)
      values (v_report_id, 'sent', v_user_id);
    end if;

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
    insert into public."PaymentReports"
      (user_id, cycle_number, amount, status, received_at, received_by)
    values
      (v_user_id, p_cycle_number, v_cycle_amount, 'retained', now(), v_user_id)
    on conflict (user_id, cycle_number) do nothing
    returning id, status, created_at
      into v_report_id, v_status, v_created_at;
  else
    insert into public."PaymentReports"
      (user_id, cycle_number, amount, status, sent_at,
       payment_method, transfer_reference)
    values
      (v_user_id, p_cycle_number, v_cycle_amount, 'sent', now(),
       v_method, v_reference)
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

    insert into public."PaymentReportEvents"
      (payment_report_id, event_type, actor_user_id)
    values (v_report_id, 'retained', v_user_id);
  else
    insert into public."PaymentReportEvents"
      (payment_report_id, event_type, actor_user_id)
    values (v_report_id, 'sent', v_user_id);
  end if;

  return query select v_report_id, v_status, v_created_at;
end;
$$;

create or replace function public.withdraw_cycle_payment_report(
  p_report_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public."PaymentReports" as report
  set status = 'withdrawn',
      withdrawn_at = now()
  where report.id = p_report_id
    and report.user_id = v_user_id
    and report.status = 'sent'
    and exists (
      select 1
      from public."Cycles" as cycle
      where cycle.cycle_number = report.cycle_number
        and cycle.status = 'active'
    );

  if not found then
    raise exception 'Only your own sent report can be withdrawn';
  end if;

  insert into public."PaymentReportEvents"
    (payment_report_id, event_type, actor_user_id)
  values (p_report_id, 'withdrawn', v_user_id);
end;
$$;

create or replace function public.reject_cycle_payment_report(
  p_report_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public."PaymentReports" as report
  set status = 'rejected',
      rejected_at = now(),
      rejected_by = v_user_id
  from public."Cycles" as cycle
  join public."PayoutSchedule" as payout
    on payout.round_number = cycle.cycle_number
   and payout.recipient_user_id = v_user_id
  where report.id = p_report_id
    and report.status = 'sent'
    and report.user_id <> v_user_id
    and cycle.cycle_number = report.cycle_number
    and cycle.status = 'active'
    and (
      select count(*)
      from public."PayoutSchedule" as cycle_payout
      where cycle_payout.round_number = cycle.cycle_number
    ) = 1;

  if not found then
    raise exception 'This sent report is unavailable or already processed';
  end if;

  insert into public."PaymentReportEvents"
    (payment_report_id, event_type, actor_user_id)
  values (p_report_id, 'rejected', v_user_id);
end;
$$;

drop function if exists public.get_active_cycle_payment_reports();

create or replace function public.get_active_cycle_payment_reports()
returns table (
  report_id uuid,
  contributor_name text,
  amount numeric,
  status text,
  sent_at timestamptz,
  received_at timestamptz,
  payment_method text,
  transfer_reference text
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
    report.received_at,
    report.payment_method,
    report.transfer_reference
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
  where report.status <> 'withdrawn'
    and (
      select count(*)
      from public."PayoutSchedule" as cycle_payout
      where cycle_payout.round_number = cycle.cycle_number
    ) = 1
  order by report.created_at desc
  limit 30;
$$;

revoke all on function public.set_my_payment_methods(text, text)
from public, anon;
revoke all on function public.get_active_cycle_recipient_payment_methods()
from public, anon;
revoke all on function public.submit_active_cycle_contribution(integer, text, text)
from public, anon;
revoke all on function public.withdraw_cycle_payment_report(uuid)
from public, anon;
revoke all on function public.reject_cycle_payment_report(uuid)
from public, anon;
revoke all on function public.get_active_cycle_payment_reports()
from public, anon;

grant execute on function public.set_my_payment_methods(text, text)
to authenticated;
grant execute on function public.get_active_cycle_recipient_payment_methods()
to authenticated;
grant execute on function public.submit_active_cycle_contribution(integer, text, text)
to authenticated;
grant execute on function public.withdraw_cycle_payment_report(uuid)
to authenticated;
grant execute on function public.reject_cycle_payment_report(uuid)
to authenticated;
grant execute on function public.get_active_cycle_payment_reports()
to authenticated;

notify pgrst, 'reload schema';
