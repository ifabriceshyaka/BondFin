-- Remove the legacy profile row when its Supabase Auth user is deleted.
-- Users.id does not currently equal auth.users.id, so the relationship uses email.

create or replace function public.delete_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public."Users"
  where lower(email) = lower(old.email);

  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;

create trigger on_auth_user_deleted
after delete on auth.users
for each row
execute function public.delete_user_profile();

revoke all on function public.delete_user_profile() from public;
