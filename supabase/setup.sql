-- Run once in Supabase SQL Editor. Safe to run again for this project's tables.
begin;
create table if not exists public.card_collections (
  owner_id text primary key,
  object_key text not null,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.card_collections enable row level security;
revoke all on public.card_collections from anon, authenticated;
grant all on public.card_collections to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('card-studio','card-studio',false,20971520,array['application/json'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=array['application/json'];

-- Optimistic locking: only the caller with the current revision can replace a collection.
create or replace function public.card_commit_collection(
 p_owner text,p_expected_revision integer,p_object_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_row public.card_collections%rowtype;
begin
 if p_owner !~ '^[a-f0-9]{64}$' or p_expected_revision < 0
 or p_object_key not like 'collections/' || p_owner || '/%' then
   raise exception 'invalid arguments';
 end if;
 -- Also serialize competing first writes when no row exists yet.
 perform pg_advisory_xact_lock(hashtextextended(p_owner, 0));
 select * into current_row from public.card_collections where owner_id=p_owner for update;
 if found then
   if current_row.revision <> p_expected_revision then
     return jsonb_build_object('conflict',true);
   end if;
   update public.card_collections set object_key=p_object_key,
     revision=current_row.revision+1,updated_at=now() where owner_id=p_owner;
   return jsonb_build_object('revision',current_row.revision+1,'previous_key',current_row.object_key);
 else
   if p_expected_revision <> 0 then return jsonb_build_object('conflict',true); end if;
   insert into public.card_collections(owner_id,object_key,revision) values(p_owner,p_object_key,1);
   return jsonb_build_object('revision',1,'previous_key',null);
 end if;
end;
$$;
revoke all on function public.card_commit_collection(text,integer,text) from public, anon, authenticated;
grant execute on function public.card_commit_collection(text,integer,text) to service_role;
commit;

-- Expected: private bucket; table RLS enabled. Do NOT add public read/write policies.
select id,public,file_size_limit from storage.buckets where id='card-studio';
