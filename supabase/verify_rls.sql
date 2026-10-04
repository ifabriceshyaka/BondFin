-- Run after applying the Users RLS migration in the Supabase SQL Editor.

-- 1. Confirm RLS is enabled.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'Users';

-- 2. Confirm the expected policy exists.
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'Users';

-- 3. Confirm the members table exists before creating member policies.
select to_regclass('public.members') as members_table;

-- 4. Functional checks must be run while signed in and signed out:
--    - Signed out: selecting public."Users" must return zero rows or be denied.
--    - Signed in: selecting public."Users" must return only the current user's row.
--    - Signed in as another user: the first user's row must not be visible.
