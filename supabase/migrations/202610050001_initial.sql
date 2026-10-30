-- Virtual Closet | PostgreSQL 15+ (security_invoker views).
-- Apply once to a new Supabase project. No service_role key is used by the app.
begin;

create type public.item_category as enum (
  'camiseta', 'calca', 'regata', 'bone_aba_reta', 'bone_aba_curta',
  'bermuda', 'jorts', 'camisa', 'polo', 'colete', 'tenis', 'outro'
);
create type public.item_fit as enum ('normal', 'boxy', 'oversized', 'cropped', 'baggy', 'baloon');

create function public.valid_photo_path(path text, owner_id uuid, kind text)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select path is null or path ~ (
    '^' || owner_id::text || '/' || kind || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  );
$$;

create table public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  category public.item_category not null,
  color text not null check (length(btrim(color)) between 1 and 50),
  size text not null check (length(btrim(size)) between 1 and 30),
  fit public.item_fit,
  brand text check (length(brand) <= 80),
  photo_path text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wardrobe_items_tenis_fit check (category <> 'tenis' or fit is null),
  constraint wardrobe_items_photo_owner check (public.valid_photo_path(photo_path, user_id, 'items'))
);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text check (length(name) <= 100),
  photo_path text,
  created_at timestamptz not null default now(),
  constraint outfits_photo_owner check (public.valid_photo_path(photo_path, user_id, 'outfits'))
);

create table public.outfit_items (
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  primary key (outfit_id, item_id)
);

create table public.wear_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  worn_date date not null,
  notes text check (length(notes) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, outfit_id, worn_date)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  caption text check (length(caption) <= 1000),
  created_at timestamptz not null default now()
);

create index wardrobe_owner_order on public.wardrobe_items(user_id, created_at desc, id desc);
create index wardrobe_owner_category on public.wardrobe_items(user_id, category) where archived_at is null;
create index outfits_owner_order on public.outfits(user_id, created_at desc, id desc);
create index outfit_items_item on public.outfit_items(item_id);
create index wear_owner_date on public.wear_log(user_id, worn_date desc);
create index wear_outfit_date on public.wear_log(outfit_id, worn_date desc);
create index posts_owner_order on public.posts(user_id, created_at desc, id desc);
create index posts_outfit on public.posts(outfit_id);

alter table public.wardrobe_items enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.wear_log enable row level security;
alter table public.posts enable row level security;

-- Explicit grants: Supabase's permissive default grants are not relied upon.
revoke all on public.wardrobe_items, public.outfits, public.outfit_items, public.wear_log, public.posts from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.wardrobe_items, public.outfits, public.outfit_items, public.wear_log, public.posts to authenticated;
grant insert (id, user_id, name, category, color, size, fit, brand, photo_path) on public.wardrobe_items to authenticated;
grant update (name, category, color, size, fit, brand, photo_path, archived_at) on public.wardrobe_items to authenticated;
grant insert (id, user_id, outfit_id, worn_date, notes) on public.wear_log to authenticated;
grant insert (id, user_id, outfit_id, caption) on public.posts to authenticated;
grant delete on public.wear_log, public.posts to authenticated;

create policy items_read on public.wardrobe_items for select to authenticated using (user_id = (select auth.uid()));
create policy items_create on public.wardrobe_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy items_edit on public.wardrobe_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy outfits_read on public.outfits for select to authenticated using (user_id = (select auth.uid()));
create policy composition_read on public.outfit_items for select to authenticated using (
  exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid()))
  and exists (select 1 from public.wardrobe_items i where i.id = item_id and i.user_id = (select auth.uid()))
);
create policy wear_read on public.wear_log for select to authenticated using (user_id = (select auth.uid()));
create policy wear_create on public.wear_log for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid())
  )
);
create policy wear_remove on public.wear_log for delete to authenticated using (user_id = (select auth.uid()));
create policy posts_read on public.posts for select to authenticated using (user_id = (select auth.uid()));
create policy posts_create on public.posts for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid())
  )
);
create policy posts_remove on public.posts for delete to authenticated using (user_id = (select auth.uid()));

create view public.item_last_worn with (security_invoker = true) as
select oi.item_id, max(wl.worn_date) as last_worn_date
from public.outfit_items oi join public.wear_log wl on wl.outfit_id = oi.outfit_id
group by oi.item_id;
create view public.outfit_last_worn with (security_invoker = true) as
select outfit_id, max(worn_date) as last_worn_date from public.wear_log group by outfit_id;
revoke all on public.item_last_worn, public.outfit_last_worn from anon, authenticated;
grant select on public.item_last_worn, public.outfit_last_worn to authenticated;

-- This is the ONLY client entry point for writing outfits/compositions.
-- SECURITY DEFINER is necessary because clients have no INSERT/UPDATE/DELETE on
-- either table. Identity, ownership, active status, duplicate IDs and path are
-- explicitly validated. search_path is empty; no dynamic SQL; grants restricted.
create function public.create_outfit(p_item_ids uuid[], p_name text default null, p_photo_path text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  result_id uuid;
  item_count integer;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_item_ids is null or cardinality(p_item_ids) not between 1 and 30 then
    raise exception 'Select 1 to 30 items' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_item_ids) x where x is null)
     or (select count(distinct x) from unnest(p_item_ids) x) <> cardinality(p_item_ids) then
    raise exception 'Duplicate or null items' using errcode = '22023';
  end if;
  if length(p_name) > 100 or not public.valid_photo_path(p_photo_path, caller, 'outfits') then
    raise exception 'Invalid outfit data' using errcode = '22023';
  end if;
  -- Share locks prevent an archive/ownership race until the transaction commits.
  perform id from public.wardrobe_items
    where id = any(p_item_ids) and user_id = caller and archived_at is null
    order by id for share;
  get diagnostics item_count = row_count;
  if item_count <> cardinality(p_item_ids) then
    raise exception 'Items unavailable' using errcode = '42501';
  end if;
  insert into public.outfits(user_id, name, photo_path)
    values (caller, nullif(btrim(p_name), ''), p_photo_path) returning id into result_id;
  insert into public.outfit_items(outfit_id, item_id) select result_id, unnest(p_item_ids);
  return result_id;
end;
$$;
revoke all on function public.create_outfit(uuid[], text, text) from public, anon, authenticated;
grant execute on function public.create_outfit(uuid[], text, text) to authenticated;
revoke all on function public.valid_photo_path(text, uuid, text) from public, anon;
grant execute on function public.valid_photo_path(text, uuid, text) to authenticated;

-- Civil date validation also applies to direct REST inserts. The IANA timezone
-- is provided in x-client-timezone; the clock always comes from the server.
create function public.validate_wear_date() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  zone text := coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-client-timezone', 'UTC');
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = zone) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;
  if new.worn_date > (current_timestamp at time zone zone)::date then
    raise exception 'Future wear date' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_wear_date() from public, anon, authenticated;
create trigger wear_date_guard before insert or update on public.wear_log
  for each row execute function public.validate_wear_date();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('closet-photos', 'closet-photos', false, 2097152, array['image/jpeg']);

create policy closet_photo_read on storage.objects for select to authenticated using (
  bucket_id = 'closet-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy closet_photo_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'closet-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~ ('^' || (select auth.uid())::text || '/(items|outfits)/[0-9a-f-]{36}\.jpg$')
);
-- No UPDATE policy: uploads use new UUIDs, never overwrite someone else's object.
create policy closet_photo_remove on storage.objects for delete to authenticated using (
  bucket_id = 'closet-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
