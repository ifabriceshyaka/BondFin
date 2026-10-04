-- Allow members to see only the recipient assigned to the active cycle.
-- BondFin has approved PayoutSchedule.round_number = Cycles.cycle_number.

drop policy if exists "Authenticated users read active cycle recipient"
on public."PayoutSchedule";

create policy "Authenticated users read active cycle recipient"
on public."PayoutSchedule"
for select
to authenticated
using (
  exists (
    select 1
    from public."Cycles" as cycle
    where cycle.status = 'active'
      and cycle.cycle_number = "PayoutSchedule".round_number
  )
);

create index if not exists payout_schedule_round_number_idx
on public."PayoutSchedule" (round_number);

-- Users.id is not auth.users.id in this project. Resolve the display name by
-- email inside a no-argument function so callers cannot look up arbitrary
-- payout recipients or access the rest of the payout rotation.
create or replace function public.get_active_cycle_recipient()
returns table (cycle_number integer, recipient_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    cycle.cycle_number,
    coalesce(
      case
        when profile.full_name ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
          then null
        else nullif(btrim(profile.full_name), '')
      end,
      nullif(btrim(recipient.raw_user_meta_data ->> 'full_name'), ''),
      'Member'
    )::text as recipient_name
  from public."Cycles" as cycle
  join public."PayoutSchedule" as payout
    on payout.round_number = cycle.cycle_number
  join auth.users as recipient
    on recipient.id = payout.recipient_user_id
  left join lateral (
    select user_profile.full_name
    from public."Users" as user_profile
    where lower(user_profile.email) = lower(recipient.email)
    order by user_profile.id
    limit 1
  ) as profile on true
  where cycle.status = 'active'
  limit 2;
$$;

revoke all on function public.get_active_cycle_recipient() from public;
revoke all on function public.get_active_cycle_recipient() from anon;
grant execute on function public.get_active_cycle_recipient() to authenticated;
