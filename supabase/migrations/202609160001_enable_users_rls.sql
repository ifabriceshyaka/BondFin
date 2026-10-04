-- Protect the existing public."Users" profile table.
-- The table's id values do not match auth.users.id in the current project,
-- so ownership is matched to the authenticated email instead.

alter table public."Users" enable row level security;

revoke all on table public."Users" from anon;
revoke all on table public."Users" from authenticated;
grant select on table public."Users" to authenticated;

drop policy if exists "Authenticated users can read their own profile" on public."Users";
drop policy if exists "Public Read Access" on public."Users";

create policy "Authenticated users can read their own profile"
on public."Users"
for select
to authenticated
using (
  lower(email) = lower(auth.jwt() ->> 'email')
);
