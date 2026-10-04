-- Allow members to update only their own safe profile fields.
-- Ownership continues to match the existing Users email-based identity model.

grant update (full_name, profile_picture)
on public."Users"
to authenticated;

drop policy if exists "Users can update their own profile" on public."Users";

create policy "Users can update their own profile"
on public."Users"
for update
to authenticated
using (
  lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  lower(email) = lower(auth.jwt() ->> 'email')
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can read avatars" on storage.objects;
create policy "Authenticated users can read avatars"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
