\set ON_ERROR_STOP on

-- Run with psql against a disposable PostgreSQL database:
-- psql "$TEST_DATABASE_URL" -f supabase/tests/payment_reporting.integration.sql

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text unique not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public."Users" (
  id bigint generated always as identity primary key,
  email text not null,
  full_name text
);

create table public."Contributions" (
  id uuid primary key default gen_random_uuid(),
  email text,
  amount numeric(12, 2) not null,
  created_at timestamptz
);

create table public."PayoutSchedule" (
  id uuid primary key default gen_random_uuid(),
  recipient_email text,
  round_number integer not null,
  payout_date date,
  created_at timestamptz
);

create table public."Transactions" (
  id uuid primary key default gen_random_uuid(),
  email text,
  amount numeric(12, 2) not null,
  type text not null,
  created_at timestamptz
);

\ir ../migrations/202609230001_secure_rosca_tables.sql
\ir ../migrations/202609240004_cycles.sql
\ir ../migrations/202610020001_active_cycle_recipient.sql
\ir ../migrations/202610020002_payment_reporting.sql
\ir ../migrations/202610030001_payment_hardening.sql

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'sender@example.test', '{"full_name":"Test Sender"}'),
  ('20000000-0000-4000-8000-000000000002', 'recipient@example.test', '{"full_name":"Test Recipient"}');

insert into public."Users" (email, full_name)
values
  ('sender@example.test', 'Test Sender'),
  ('recipient@example.test', 'Test Recipient');

insert into public."Cycles"
  (cycle_number, start_date, due_date, contribution_amount, status)
values
  (1, current_date, current_date + 14, 100.00, 'active');

insert into public."PayoutSchedule"
  (recipient_user_id, round_number, payout_date)
values
  ('20000000-0000-4000-8000-000000000002', 1, current_date + 14);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

do $$
declare
  v_report_count integer;
begin
  select count(*) into v_report_count
  from public.get_active_cycle_payment_reports();
  if v_report_count <> 0 then
    raise exception 'A non-recipient can see incoming reports';
  end if;
end;
$$;

select * from public.submit_active_cycle_contribution(1, 'zelle', 'ZL-12345');
select * from public.submit_active_cycle_contribution(1, 'zelle', 'ZL-12345');

do $$
declare
  v_status text;
  v_contribution_count integer;
  v_report_id uuid;
  v_report_count integer;
begin
  select count(*) into v_report_count
  from public."PaymentReports"
  where user_id = auth.uid() and cycle_number = 1;

  if v_report_count <> 1 then
    raise exception 'Repeated sent action created duplicate reports';
  end if;

  select status, id into v_status, v_report_id
  from public."PaymentReports"
  where user_id = auth.uid() and cycle_number = 1;

  if v_status <> 'sent' then
    raise exception 'Sending member report status must be sent, got %', v_status;
  end if;

  select count(*) into v_contribution_count
  from public."Contributions"
  where user_id = auth.uid() and cycle_number = 1;

  if v_contribution_count <> 0 then
    raise exception 'A sent report must not create a received contribution';
  end if;

  begin
    perform public.confirm_cycle_payment_received(v_report_id);
    raise exception 'A non-recipient unexpectedly confirmed receipt';
  exception
    when raise_exception then
      if sqlerrm = 'A non-recipient unexpectedly confirmed receipt' then
        raise;
      end if;
  end;

  begin
    insert into public."PaymentReports"
      (user_id, cycle_number, amount, status, sent_at)
    values
      (auth.uid(), 1, 1, 'sent', now());
    raise exception 'A member unexpectedly inserted a payment report directly';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
begin
  if (
    select count(*)
    from public."PaymentReportEvents"
    where event_type = 'sent'
      and actor_user_id = '10000000-0000-4000-8000-000000000001'
  ) <> 1 then
    raise exception 'Sent action was not recorded in the append-only event log';
  end if;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

do $$
declare
  v_report_count integer;
  v_private_report_count integer;
  v_report_id uuid;
begin
  select count(*) into v_private_report_count
  from public."PaymentReports"
  where user_id = '10000000-0000-4000-8000-000000000001'
    and cycle_number = 1;

  if v_private_report_count <> 0 then
    raise exception 'Recipient directly read another member''s private report row';
  end if;

  select count(*) into v_report_count
  from public.get_active_cycle_payment_reports();
  if v_report_count <> 1 then
    raise exception 'Scheduled recipient must see exactly one incoming report';
  end if;

  select report_id into v_report_id
  from public.get_active_cycle_payment_reports();

  perform public.confirm_cycle_payment_received(v_report_id);
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public."PaymentReports"
    where user_id = '10000000-0000-4000-8000-000000000001'
      and cycle_number = 1
      and status = 'received'
      and received_by = '20000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Recipient confirmation did not update report to received';
  end if;

  if not exists (
    select 1
    from public."Contributions"
    where user_id = '10000000-0000-4000-8000-000000000001'
      and cycle_number = 1
      and amount = 100.00
  ) then
    raise exception 'Recipient confirmation did not create the contribution';
  end if;

  if (
    select count(*)
    from public."PaymentReportEvents"
    where payment_report_id = (
      select id from public."PaymentReports"
      where user_id = '10000000-0000-4000-8000-000000000001'
        and cycle_number = 1
    )
  ) <> 2 then
    raise exception 'Expected sent and received events in the audit log';
  end if;
end;
$$;

update public."Cycles" set status = 'completed' where cycle_number = 1;
insert into public."Cycles"
  (cycle_number, start_date, due_date, contribution_amount, status)
values
  (2, current_date, current_date + 14, 125.00, 'active');

insert into public."PayoutSchedule"
  (recipient_user_id, round_number, payout_date)
values
  ('10000000-0000-4000-8000-000000000001', 2, current_date + 14);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select * from public.submit_active_cycle_contribution(2);

reset role;

do $$
begin
  if not exists (
    select 1
    from public."PaymentReports"
    where user_id = '10000000-0000-4000-8000-000000000001'
      and cycle_number = 2
      and amount = 125.00
      and status = 'retained'
  ) then
    raise exception 'Cycle recipient contribution was not marked retained';
  end if;

  if not exists (
    select 1
    from public."Contributions"
    where user_id = '10000000-0000-4000-8000-000000000001'
      and cycle_number = 2
      and amount = 125.00
  ) then
    raise exception 'Retained recipient contribution was not entered in the ledger';
  end if;
end;
$$;

update public."Cycles" set status = 'completed' where cycle_number = 2;
insert into public."Cycles"
  (cycle_number, start_date, due_date, contribution_amount, status)
values
  (3, current_date, current_date + 14, 100.00, 'active');

insert into public."PayoutSchedule"
  (recipient_user_id, round_number, payout_date)
values
  ('10000000-0000-4000-8000-000000000001', 3, current_date + 14),
  ('20000000-0000-4000-8000-000000000002', 3, current_date + 14);

set local role authenticated;

do $$
begin
  begin
    perform * from public.submit_active_cycle_contribution(3);
    raise exception 'A cycle with multiple recipients unexpectedly accepted a report';
  exception
    when raise_exception then
      if sqlerrm = 'A cycle with multiple recipients unexpectedly accepted a report' then
        raise;
      end if;
      if sqlerrm <> 'This cycle does not have exactly one scheduled recipient' then
        raise;
      end if;
  end;
end;
$$;

reset role;

update public."Cycles" set status = 'completed' where cycle_number = 3;
insert into public."Cycles"
  (cycle_number, start_date, due_date, contribution_amount, status)
values
  (4, current_date, current_date + 14, 100.00, 'active');
insert into public."PayoutSchedule"
  (recipient_user_id, round_number, payout_date)
values
  ('20000000-0000-4000-8000-000000000002', 4, current_date + 14);

-- Recipient saves payment details
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.set_my_payment_methods('pay@example.test', '$TestRecipient');
reset role;

-- Sender: details visible, reference required
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;

do $$
declare v_zelle text;
begin
  select zelle_contact into v_zelle
  from public.get_active_cycle_recipient_payment_methods();
  if v_zelle is distinct from 'pay@example.test' then
    raise exception 'Recipient payment details not visible to member';
  end if;

  begin
    perform * from public.submit_active_cycle_contribution(4);
    raise exception 'Report without reference accepted';
  exception when raise_exception then
    if sqlerrm = 'Report without reference accepted' then raise; end if;
  end;
  begin
    perform * from public.submit_active_cycle_contribution(4, 'zelle', 'ab');
    raise exception 'Short reference accepted';
  exception when raise_exception then
    if sqlerrm = 'Short reference accepted' then raise; end if;
  end;
end;
$$;

select * from public.submit_active_cycle_contribution(4, 'cash_app', 'CA-998877');

-- Sender cannot reject own report
do $$
declare v_id uuid;
begin
  select id into v_id from public."PaymentReports"
  where user_id = auth.uid() and cycle_number = 4;
  begin
    perform public.reject_cycle_payment_report(v_id);
    raise exception 'Sender rejected own report';
  exception when raise_exception then
    if sqlerrm = 'Sender rejected own report' then raise; end if;
  end;
  perform public.withdraw_cycle_payment_report(v_id);
  if (select status from public."PaymentReports" where id = v_id) <> 'withdrawn' then
    raise exception 'Withdraw did not set status';
  end if;
end;
$$;

-- Re-report after withdraw
select * from public.submit_active_cycle_contribution(4, 'zelle', 'ZL-REDO-1');

-- Recipient rejects
reset role;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
set local role authenticated;

do $$
declare v_id uuid;
begin
  select report_id into v_id from public.get_active_cycle_payment_reports()
  where status = 'sent' limit 1;
  perform public.reject_cycle_payment_report(v_id);
  if (select status from public."PaymentReports" where id = v_id) <> 'rejected' then
    raise exception 'Reject did not set status';
  end if;
end;
$$;

reset role;
do $$
begin
  if exists (
    select 1 from public."Contributions"
    where user_id = '10000000-0000-4000-8000-000000000001' and cycle_number = 4
  ) then
    raise exception 'Ledger written for withdrawn/rejected report';
  end if;
end;
$$;

\echo 'PASS (hardening): payment details visibility, required reference, withdraw, re-report, reject, no ledger write'
\echo 'PASS (base): sent state and idempotency, no premature contribution, direct write denial, recipient-only report view/confirmation, received ledger write, retained recipient contribution, audit events and ambiguous-recipient rejection'

rollback;
