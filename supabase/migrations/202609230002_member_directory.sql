-- Expose only safe profile fields to authenticated members.
-- The Users table remains private and its existing RLS policy is unchanged.

create or replace view public."MemberDirectory" as
select
  id,
  case
    when full_name ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      then 'Member'
    else full_name
  end as full_name,
  profile_picture
from public."Users";

revoke all on table public."MemberDirectory" from anon;
revoke all on table public."MemberDirectory" from authenticated;
grant select on table public."MemberDirectory" to authenticated;