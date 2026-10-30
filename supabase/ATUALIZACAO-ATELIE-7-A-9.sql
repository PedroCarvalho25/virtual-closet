-- Virtual Closet: atualizações 7, 8 e 9. Aplicar depois das seis anteriores.

-- 202610150002_atelier.sql
-- Seventh migration: photographic collections and private visual compositions.
begin;
create table public.atelier_collections (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 100), note text not null default '' check(length(note)<=1200),
 event text not null default '' check(length(event)<=160), featured boolean not null default false,
 cover_id uuid references public.social_publications(id) on delete set null, revision integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.atelier_entries (
 collection_id uuid not null references public.atelier_collections(id) on delete cascade,
 publication_id uuid not null references public.social_publications(id) on delete cascade,
 position integer not null, note text not null default '' check(length(note)<=1200), primary key(collection_id,publication_id)
);
create table public.atelier_members (
 collection_id uuid not null references public.atelier_collections(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in ('view','edit')),
 primary key(collection_id,user_id)
);
create table public.atelier_comments (
 id uuid primary key default gen_random_uuid(), collection_id uuid not null references public.atelier_collections(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, body text not null check(length(btrim(body)) between 1 and 600),
 created_at timestamptz not null default now()
);
create table public.atelier_designs (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 100), note text not null default '' check(length(note)<=1200),
 layers jsonb not null check(jsonb_typeof(layers)='array' and jsonb_array_length(layers)<=30 and octet_length(layers::text)<=40000),
 source_id uuid references public.social_publications(id) on delete set null,
 parent_id uuid references public.atelier_designs(id) on delete set null,
 outfit_id uuid references public.outfits(id) on delete set null,
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create index atelier_collections_owner on public.atelier_collections(owner_id,updated_at desc);
create index atelier_members_user on public.atelier_members(user_id);
create index atelier_designs_owner on public.atelier_designs(owner_id,updated_at desc);
create index atelier_comments_collection on public.atelier_comments(collection_id,created_at);
alter table public.atelier_collections enable row level security;
alter table public.atelier_entries enable row level security;
alter table public.atelier_members enable row level security;
alter table public.atelier_comments enable row level security;
alter table public.atelier_designs enable row level security;
revoke all on public.atelier_collections,public.atelier_entries,public.atelier_members,public.atelier_comments,public.atelier_designs from public,anon,authenticated;

create function public.atelier_permission(c public.atelier_collections) returns text
language sql stable security definer set search_path='' as $$
 select case when not public.closet_session_allowed() then null when c.owner_id=auth.uid() then 'owner'
 when exists(select 1 from public.member_blocks where (blocker_id=auth.uid() and blocked_id=c.owner_id) or (blocked_id=auth.uid() and blocker_id=c.owner_id)) then null
 else coalesce((select role from public.atelier_members where collection_id=c.id and user_id=auth.uid()),
 case when c.featured and public.profile_is_visible(c.owner_id) then 'view' end) end;
$$;
create function public.atelier_collection_json(c public.atelier_collections) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',c.id,'ownerId',c.owner_id,'title',c.title,'note',c.note,'event',c.event,
 'featured',c.featured,'coverId',c.cover_id,'revision',c.revision,'permission',public.atelier_permission(c),
 'entries',coalesce((select jsonb_agg(jsonb_build_object('publication',public.social_json(p),'note',e.note) order by e.position,p.id)
 from public.atelier_entries e join public.social_publications p on p.id=e.publication_id where e.collection_id=c.id and public.social_visible(p)),'[]'),
 'members',case when c.owner_id=auth.uid() then coalesce((select jsonb_agg(jsonb_build_object('author',public.social_author(m.user_id),'role',m.role)) from public.atelier_members m where m.collection_id=c.id),'[]') else '[]'::jsonb end,
 'comments',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'body',v.body,'author',public.social_author(v.user_id),'createdAt',v.created_at) order by v.created_at)
 from (select * from public.atelier_comments m where m.collection_id=c.id and not exists(select 1 from public.member_blocks b where (b.blocker_id=auth.uid() and b.blocked_id=m.user_id) or (b.blocked_id=auth.uid() and b.blocker_id=m.user_id)) order by created_at desc limit 100) v),'[]'));
$$;
create function public.atelier_design_json(d public.atelier_designs) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',d.id,'title',d.title,'note',d.note,'layers',d.layers,'sourceId',d.source_id,
 'parentId',d.parent_id,'outfitId',d.outfit_id,'revision',d.revision,'updatedAt',d.updated_at);
$$;
revoke all on function public.atelier_permission(public.atelier_collections),public.atelier_collection_json(public.atelier_collections),public.atelier_design_json(public.atelier_designs) from public,anon,authenticated;

create function public.atelier_action(p_action jsonb default '{"action":"list"}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); a text:=p_action->>'action'; target uuid; c public.atelier_collections; d public.atelier_designs;
 permission text; value jsonb; entry jsonb; ids uuid[]; ref uuid; result_id uuid; i integer:=0; k text;
begin
 perform public.require_closet_session();
 if p_action is null or octet_length(p_action::text)>60000 then raise exception 'INVALID_REQUEST' using errcode='22023';end if;
 if a='list' then
 return jsonb_build_object('collections',coalesce((select jsonb_agg(public.atelier_collection_json(t)) from
 (select * from public.atelier_collections q where public.atelier_permission(q) is not null and
 (case when p_action->>'ownerId' is not null then q.owner_id=(p_action->>'ownerId')::uuid and q.featured
 else q.owner_id=caller or exists(select 1 from public.atelier_members m where m.collection_id=q.id and m.user_id=caller) end)
 order by updated_at desc,id limit 200) t),'[]'),
 'designs',case when p_action->>'ownerId' is null then coalesce((select jsonb_agg(public.atelier_design_json(t)) from
 (select * from public.atelier_designs where owner_id=caller order by updated_at desc,id limit 200) t),'[]') else '[]'::jsonb end);
 end if;
 target:=nullif(p_action->>'id','')::uuid;
 if a='create_collection' then
   perform 1 from auth.users where id=caller for update;
   if (select count(*) from public.atelier_collections where owner_id=caller)>=200 then raise exception 'LIMIT' using errcode='22023';end if;
   insert into public.atelier_collections(owner_id,title) values(caller,btrim(p_action->>'title')) returning * into c;
   return public.atelier_collection_json(c);
 elsif a in ('save_design','delete_design','save_outfit') then
   select * into d from public.atelier_designs where id=target for update;
   if d.id is not null and d.owner_id<>caller then raise exception 'UNAVAILABLE' using errcode='42501';end if;
   if a='delete_design' then
     if d.id is null then raise exception 'UNAVAILABLE' using errcode='42501';end if;
     delete from public.atelier_designs where id=target and owner_id=caller;return 'null';
   end if;
   if a='save_outfit' then
     if d.id is null then raise exception 'UNAVAILABLE' using errcode='42501';end if;
     if d.outfit_id is not null then return public.atelier_design_json(d);end if;
     if d.revision is distinct from (p_action->>'revision')::integer then raise exception 'CONFLICT' using errcode='40001';end if;
     select array_agg(distinct (v->>'target')::uuid) into ids from jsonb_array_elements(d.layers) v where v->>'kind'='item';
     result_id:=public.create_outfit(ids,d.title,null);
     update public.atelier_designs set outfit_id=result_id,revision=revision+1,updated_at=now() where id=target returning * into d;
     return public.atelier_design_json(d);
   end if;
   value:=p_action->'design';
   if d.id is not null and (d.outfit_id is not null or d.revision is distinct from (value->>'revision')::integer) then raise exception 'CONFLICT' using errcode='40001';end if;
   if d.id is null and coalesce((value->>'revision')::integer,0)<>0 then raise exception 'CONFLICT' using errcode='40001';end if;
   if value is null or jsonb_typeof(value->'layers') is distinct from 'array' or jsonb_array_length(value->'layers')>30 then raise exception 'INVALID_LAYERS' using errcode='22023';end if;
   perform public.closet_strings(value,array['title','note']);
   for entry in select * from jsonb_array_elements(value->'layers') loop
     perform public.closet_strings(entry,array['id','kind','target']);
     ref:=(entry->>'target')::uuid;
     if entry->>'kind'='item' then
       if not exists(select 1 from public.wardrobe_items where id=ref and user_id=caller and archived_at is null) then raise exception 'ITEM_UNAVAILABLE' using errcode='42501';end if;
     elsif entry->>'kind'='reference' then
       if not exists(select 1 from public.social_publications p where p.id=ref and public.social_visible(p)) then raise exception 'REFERENCE_UNAVAILABLE' using errcode='42501';end if;
     else raise exception 'INVALID_KIND' using errcode='22023';end if;
     foreach k in array array['x','y','width','height','rotation'] loop
       if jsonb_typeof(entry->k) is distinct from 'number' then raise exception 'INVALID_GEOMETRY' using errcode='22023';end if;
     end loop;
     if (entry->>'x')::numeric not between 0 and 330 or (entry->>'y')::numeric not between 0 and 450
     or (entry->>'width')::numeric not between 36 and 360 or (entry->>'height')::numeric not between 36 and 480
     or (entry->>'rotation')::numeric not between -180 and 180 then raise exception 'INVALID_GEOMETRY' using errcode='22023';end if;
     if entry ? 'crop' then
       foreach k in array array['x','y','width','height'] loop
         if jsonb_typeof(entry->'crop'->k) is distinct from 'number' or (entry->'crop'->>k)::numeric not between 0 and 1 then raise exception 'INVALID_CROP' using errcode='22023';end if;
       end loop;
       if (entry->'crop'->>'width')::numeric<0.05 or (entry->'crop'->>'height')::numeric<0.05 or
       (entry->'crop'->>'x')::numeric+(entry->'crop'->>'width')::numeric>1.001 or
       (entry->'crop'->>'y')::numeric+(entry->'crop'->>'height')::numeric>1.001 then raise exception 'INVALID_CROP' using errcode='22023';end if;
     end if;
   end loop;
   if (select count(distinct v->>'id') from jsonb_array_elements(value->'layers') v)<>jsonb_array_length(value->'layers') then raise exception 'DUPLICATE_LAYER' using errcode='22023';end if;
   ref:=nullif(value->>'sourceId','')::uuid;
   if ref is not null and not exists(select 1 from public.social_publications p where p.id=ref and public.social_visible(p)) then raise exception 'UNAVAILABLE' using errcode='42501';end if;
   if value->>'parentId' is not null and not exists(select 1 from public.atelier_designs where id=(value->>'parentId')::uuid and owner_id=caller) then raise exception 'UNAVAILABLE' using errcode='42501';end if;
   perform 1 from auth.users where id=caller for update;
   if d.id is null and (select count(*) from public.atelier_designs where owner_id=caller)>=200 then raise exception 'LIMIT' using errcode='22023';end if;
   insert into public.atelier_designs(id,owner_id,title,note,layers,source_id,parent_id)
   values(target,caller,btrim(value->>'title'),value->>'note',value->'layers',ref,(value->>'parentId')::uuid)
   on conflict(id) do update set title=excluded.title,note=excluded.note,layers=excluded.layers,source_id=excluded.source_id,revision=public.atelier_designs.revision+1,updated_at=now()
   where public.atelier_designs.owner_id=caller and public.atelier_designs.revision=(value->>'revision')::integer and public.atelier_designs.outfit_id is null
   returning * into d;
   if d.id is null then raise exception 'CONFLICT' using errcode='40001';end if;
   return public.atelier_design_json(d);
 end if;
 select * into c from public.atelier_collections where id=target for update;
 permission:=public.atelier_permission(c);
 if c.id is null or permission is null then raise exception 'UNAVAILABLE' using errcode='42501';end if;
 if a='get_collection' then return public.atelier_collection_json(c);end if;
 if a='leave_collection' and c.owner_id<>caller then
 delete from public.atelier_members where collection_id=target and user_id=caller;return 'null';end if;
 if a='comment' then
   if c.owner_id<>caller and not exists(select 1 from public.atelier_members where collection_id=target and user_id=caller) then raise exception 'MEMBER_REQUIRED' using errcode='42501';end if;
   if (select count(*) from public.atelier_comments where user_id=caller and created_at>now()-interval '1 hour')>=60 then raise exception 'LIMIT' using errcode='22023';end if;
   insert into public.atelier_comments(collection_id,user_id,body) values(target,caller,btrim(p_action->>'body'));
 elsif a='delete_comment' then
   delete from public.atelier_comments where id=(p_action->>'commentId')::uuid and collection_id=target and (user_id=caller or c.owner_id=caller);
 elsif a in ('grant','revoke','delete_collection','feature') then
   if permission<>'owner' then raise exception 'OWNER_REQUIRED' using errcode='42501';end if;
   if a='delete_collection' then delete from public.atelier_collections where id=target;return 'null';
   elsif a='feature' then
     if (p_action->>'active')::boolean and not exists(select 1 from public.member_profiles where user_id=caller and discoverable) then raise exception 'PUBLIC_PROFILE_REQUIRED' using errcode='42501';end if;
     update public.atelier_collections set featured=(p_action->>'active')::boolean,revision=revision+1 where id=target;
   elsif a='revoke' then delete from public.atelier_members where collection_id=target and user_id=(p_action->>'userId')::uuid;
   else
     ref:=(p_action->>'userId')::uuid;
     if not public.social_friends(caller,ref) then raise exception 'FRIEND_REQUIRED' using errcode='42501';end if;
     if (select count(*) from public.atelier_members where collection_id=target)>=30 then raise exception 'LIMIT' using errcode='22023';end if;
     insert into public.atelier_members(collection_id,user_id,role) values(target,ref,p_action->>'role')
     on conflict(collection_id,user_id) do update set role=excluded.role;
   end if;
 elsif a in ('save_collection','add_entry','remove_entry','entry_note','order_entries','cover') then
   if permission not in ('owner','edit') then raise exception 'EDIT_REQUIRED' using errcode='42501';end if;
   if c.revision is distinct from (p_action->>'revision')::integer then raise exception 'CONFLICT' using errcode='40001';end if;
   if a='save_collection' then update public.atelier_collections set title=btrim(p_action->>'title'),note=p_action->>'note',event=p_action->>'event' where id=target;
   elsif a='add_entry' then
     ref:=(p_action->>'publicationId')::uuid;
     if not exists(select 1 from public.social_publications p where p.id=ref and public.social_visible(p)) then raise exception 'UNAVAILABLE' using errcode='42501';end if;
     if (select count(*) from public.atelier_entries where collection_id=target)>=100 then raise exception 'LIMIT' using errcode='22023';end if;
     insert into public.atelier_entries(collection_id,publication_id,position) values(target,ref,coalesce((select max(position)+1 from public.atelier_entries where collection_id=target),0)) on conflict do nothing;
   elsif a='remove_entry' then delete from public.atelier_entries where collection_id=target and publication_id=(p_action->>'publicationId')::uuid;
     update public.atelier_collections set cover_id=null where id=target and cover_id=(p_action->>'publicationId')::uuid;
   elsif a='entry_note' then update public.atelier_entries set note=p_action->>'note' where collection_id=target and publication_id=(p_action->>'publicationId')::uuid;
   elsif a='cover' then
     ref:=(p_action->>'publicationId')::uuid;
     if not exists(select 1 from public.atelier_entries where collection_id=target and publication_id=ref) then raise exception 'INVALID_COVER' using errcode='22023';end if;
     update public.atelier_collections set cover_id=ref where id=target;
   else
     if jsonb_typeof(p_action->'ids') is distinct from 'array' or jsonb_array_length(p_action->'ids')>100 then raise exception 'INVALID_ORDER' using errcode='22023';end if;
     select array_agg(value::uuid) into ids from jsonb_array_elements_text(p_action->'ids');
     if cardinality(ids)<>(select count(distinct x) from unnest(ids) x) or exists(select 1 from unnest(ids) x where not exists(select 1 from public.atelier_entries where collection_id=target and publication_id=x)) then raise exception 'INVALID_ORDER' using errcode='22023';end if;
     -- Reorders visible entries only. Hidden publications never leak or get re-published.
     update public.atelier_entries set position=position+1000 where collection_id=target;
     foreach ref in array coalesce(ids,'{}'::uuid[]) loop update public.atelier_entries set position=i where collection_id=target and publication_id=ref;i:=i+1;end loop;
   end if;
   update public.atelier_collections set revision=revision+1,updated_at=now() where id=target;
 else raise exception 'INVALID_ACTION' using errcode='22023';end if;
 select * into c from public.atelier_collections where id=target;
 return public.atelier_collection_json(c);
end;
$$;
revoke all on function public.atelier_action(jsonb) from public,anon;
grant execute on function public.atelier_action(jsonb) to authenticated;
commit;


-- 202610150003_capture_planning.sql
-- Eighth migration. Enum changes commit before the updated validation function uses them.
begin;
alter type public.item_category add value if not exists 'blusa';
alter type public.item_category add value if not exists 'moletom';
alter type public.item_category add value if not exists 'trico';
alter type public.item_category add value if not exists 'jaqueta';
alter type public.item_category add value if not exists 'casaco';
alter type public.item_category add value if not exists 'blazer';
alter type public.item_category add value if not exists 'saia';
alter type public.item_category add value if not exists 'vestido';
alter type public.item_category add value if not exists 'macacao';
alter type public.item_category add value if not exists 'bota';
alter type public.item_category add value if not exists 'sandalia';
alter type public.item_category add value if not exists 'sapato';
alter type public.item_category add value if not exists 'bolsa';
alter type public.item_category add value if not exists 'cinto';
alter type public.item_category add value if not exists 'joia';
alter type public.item_category add value if not exists 'lenco';
commit;
begin;
create or replace function public.closet_apply_before_identity(p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); a text:=p_action->>'action'; p jsonb; d jsonb; doc_id uuid; k text; existing public.closet_documents%rowtype; v jsonb; pair record; cents integer; day date; today date;
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_action is null or octet_length(p_action::text)>40000 then raise exception 'Invalid request' using errcode='22023';end if;
 insert into public.closet_profiles(user_id) values(caller) on conflict do nothing;
 perform user_id from public.closet_profiles where user_id=caller for update;
 -- Date validation uses the same user time zone header as wear_log, falling back safely.
 begin today:=(now() at time zone coalesce(nullif(current_setting('request.headers',true), '')::jsonb->>'x-client-timezone','UTC'))::date;
 exception when others then today:=(now() at time zone 'UTC')::date;end;
 if a in ('favorite_item','price','item_detail') then
   doc_id:=(p_action->>'id')::uuid;
   if not exists(select 1 from public.wardrobe_items where id=doc_id and user_id=caller) then raise exception 'Item unavailable' using errcode='42501';end if;
   insert into public.closet_item_meta(item_id,user_id) values(doc_id,caller) on conflict do nothing;
   if a='favorite_item' then update public.closet_item_meta set favorite=not favorite where item_id=doc_id and user_id=caller;
   elsif a='price' then
     if jsonb_typeof(p_action->'cents') not in ('number','null') or not (p_action ? 'cents') or (jsonb_typeof(p_action->'cents')='number' and (p_action->>'cents') !~ '^\d+$') then raise exception 'Invalid price' using errcode='22023';end if;
     cents:=(p_action->>'cents')::integer;
     update public.closet_item_meta set price_cents=cents where item_id=doc_id and user_id=caller;
   else
     p:=p_action->'detail';
     perform public.closet_strings(p,array['state','location','story','care','loanTo']);
     if p is null or not(p ?& array['state','location','story','care','loanTo','returnDate','weightGrams']) or coalesce(p->>'state','') not in ('available','dirty','washing','repair','lent','stored','selling','donating') or length(p->>'location')>80 or length(p->>'story')>1000 or length(p->>'care')>300 or length(p->>'loanTo')>80 then raise exception 'Invalid item detail' using errcode='22023';end if;
     if p->>'returnDate' is not null then if p->>'returnDate' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023';end if;day:=(p->>'returnDate')::date;end if;
     if p->>'careReminderDate' is not null then if p->>'careReminderDate' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid care date' using errcode='22023';end if;day:=(p->>'careReminderDate')::date;end if;
     if p->>'weightGrams' is not null and ((p->>'weightGrams') !~ '^\d+$' or (p->>'weightGrams')::integer not between 0 and 50000) then raise exception 'Invalid weight' using errcode='22023';end if;
     update public.closet_item_meta set detail=p where item_id=doc_id and user_id=caller;
   end if;
 elsif a='favorite_outfit' then
   doc_id:=(p_action->>'id')::uuid;
   if not exists(select 1 from public.outfits where id=doc_id and user_id=caller) then raise exception 'Outfit unavailable' using errcode='42501';end if;
   insert into public.closet_outfit_meta(outfit_id,user_id,favorite) values(doc_id,caller,true) on conflict(outfit_id) do update set favorite=not public.closet_outfit_meta.favorite where public.closet_outfit_meta.user_id=caller;
 elsif a='profile' then
   p:=p_action->'profile';
   perform public.closet_strings(p,array['name','city','feeling','thermal','environment']);
   if p is null or not(p ?& array['name','feeling','thermal','environment','boldness','avoidRecent','challenges','noBuy','city']) or length(p->>'name')>80 or length(p->>'city')>100 or coalesce(p->>'feeling','') not in ('comfortable','clean','expressive') or coalesce(p->>'thermal','') not in ('neutral','cold','warm') or coalesce(p->>'environment','') not in ('outside','inside','aircon') or coalesce(p->>'boldness','') not in ('0','1','2') or jsonb_typeof(p->'avoidRecent') is distinct from 'boolean' or jsonb_typeof(p->'challenges') is distinct from 'boolean' or jsonb_typeof(p->'noBuy') is distinct from 'boolean' or (p ? 'haptics' and jsonb_typeof(p->'haptics') is distinct from 'boolean') or jsonb_typeof(p->'boldness') is distinct from 'number' then raise exception 'Invalid profile' using errcode='22023';end if;
   update public.closet_profiles set profile=p where user_id=caller;
 elsif a in ('remove_plan','remove_recipe','remove_wish') then
   k:=replace(a,'remove_','');delete from public.closet_documents where id=(p_action->>'id')::uuid and user_id=caller and kind=k;
 elsif a='clear_learning' then
   delete from public.closet_documents where user_id=caller and kind in ('feedback','decision');
 elsif a='plan_detail' then
   select * into existing from public.closet_documents where id=(p_action->>'id')::uuid and user_id=caller and kind='plan';
   if not found then raise exception 'Plan unavailable' using errcode='42501';end if;
   p:=p_action->'detail';perform public.closet_check_ids(p->'packed',caller,'item',100);perform public.closet_check_ids(p->'backupOutfitIds',caller,'outfit',30);
   if jsonb_typeof(p->'days') is distinct from 'object' or jsonb_typeof(p->'tasks') is distinct from 'array' or jsonb_array_length(p->'tasks')>30 or exists(select 1 from jsonb_array_elements(p->'tasks') t where jsonb_typeof(t)<>'string' or length(t#>>'{}')>100) then raise exception 'Invalid packing details' using errcode='22023';end if;
   for pair in select * from jsonb_each(p->'days') loop
     if pair.key !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023';end if;
     day:=pair.key::date;if day<(existing.payload->>'date')::date or day>(existing.payload->>'end_date')::date then raise exception 'Date outside plan' using errcode='22023';end if;
     perform public.closet_check_ids(pair.value,caller,'outfit',30);
   end loop;
   if exists(select 1 from jsonb_array_elements_text(p->'packed') packed where
     not exists(select 1 from jsonb_array_elements_text(existing.payload->'item_ids') x where x=packed)
     and not exists(select 1 from public.outfit_items oi join public.outfits o on o.id=oi.outfit_id and o.user_id=caller where oi.item_id=packed::uuid and
       (oi.outfit_id::text in(select jsonb_array_elements_text(existing.payload->'outfit_ids')) or oi.outfit_id::text in(select jsonb_array_elements_text(p->'backupOutfitIds')) or oi.outfit_id::text in(select jsonb_array_elements_text(value) from jsonb_each(p->'days')))))
     then raise exception 'Packed item is outside this plan' using errcode='22023';end if;
   if p ? 'activities' then
     if jsonb_typeof(p->'activities') is distinct from 'object' or octet_length((p->'activities')::text)>12000 then raise exception 'Invalid activities' using errcode='22023';end if;
     for pair in select * from jsonb_each(p->'activities') loop
       if pair.key !~ '^\d{4}-\d{2}-\d{2}$' or jsonb_typeof(pair.value)<>'string' or length(pair.value#>>'{}')>240 then raise exception 'Invalid activity' using errcode='22023';end if;
       day:=pair.key::date;if day<(existing.payload->>'date')::date or day>(existing.payload->>'end_date')::date then raise exception 'Date outside plan' using errcode='22023';end if;
     end loop;
   end if;
   update public.closet_documents set detail=p,updated_at=now() where id=existing.id and user_id=caller;
 elsif a in ('plan','recipe','wish','feedback','decision') then
   k:=a;p:=p_action->a;if p is null or jsonb_typeof(p)<>'object' then raise exception 'Invalid document' using errcode='22023';end if;
   doc_id:=coalesce((p->>'id')::uuid,gen_random_uuid());
   if exists(select 1 from public.closet_documents where id=doc_id and (user_id<>caller or kind<>k)) then raise exception 'Document unavailable' using errcode='42501';end if;
   if k in ('plan','recipe','wish') and (coalesce(length(btrim(p->>'title')),0) not between 1 and 80) then raise exception 'Title required' using errcode='22023';end if;
   if k='plan' then
     perform public.closet_strings(p,array['title','date','end_date','kind','notes']);
     if p->>'date' !~ '^\d{4}-\d{2}-\d{2}$' or p->>'end_date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023';end if;
     if not(p ?& array['date','end_date','kind','outfit_ids','item_ids','notes','reminder']) or (p->>'date')::date>(p->>'end_date')::date or coalesce(p->>'kind','') not in ('day','party','wedding','trip') or length(p->>'notes')>300 or jsonb_typeof(p->'reminder') is distinct from 'boolean' then raise exception 'Invalid plan' using errcode='22023';end if;
     perform public.closet_check_ids(p->'item_ids',caller,'item',100);perform public.closet_check_ids(p->'outfit_ids',caller,'outfit',30);
     if jsonb_array_length(p->'item_ids')+jsonb_array_length(p->'outfit_ids')=0 then raise exception 'Select an item or outfit' using errcode='22023';end if;
   elsif k in ('recipe','wish') then
     perform public.closet_strings(p,array['title','note','source']);
     if coalesce(length(p->>'note'),501)>500 or coalesce(length(p->>'source'),1001)>1000 or (p->>'source'<>'' and (p->>'source' !~ '^https://[^/@[:space:]]+([/:?].*)?$' or p->>'source' ~ '^https://[^/]*@')) then raise exception 'Invalid source or note' using errcode='22023';end if;
     if k='recipe' then
       perform public.closet_strings(p,array['folder']);
       if length(p->>'folder')>50 or jsonb_typeof(p->'slots') is distinct from 'array' or jsonb_array_length(p->'slots') not between 1 and 8 then raise exception 'Invalid recipe' using errcode='22023';end if;
       for v in select value from jsonb_array_elements(p->'slots') loop
         perform public.closet_strings(v,array['role','category','color']);
         if v->>'role' <> (case when v->>'category' in ('camiseta','regata','camisa','polo','blusa','moletom','trico') then 'top' when v->>'category' in ('calca','bermuda','jorts','saia') then 'bottom' when v->>'category' in ('tenis','bota','sandalia','sapato') then 'shoes' when v->>'category' in ('vestido','macacao') then 'onepiece' when v->>'category' in ('bolsa','cinto','joia','lenco') or v->>'category' like 'bone_%' then 'accessory' else 'layer' end) then raise exception 'Invalid role for category' using errcode='22023';end if;
         if coalesce(v->>'role','') not in ('top','bottom','layer','shoes','accessory','onepiece') or length(v->>'color')>50 then raise exception 'Invalid slot' using errcode='22023';end if;
         perform (v->>'category')::public.item_category;
       end loop;
     else
       perform public.closet_strings(p,array['category','color']);
       perform (p->>'category')::public.item_category;
       if length(p->>'color')>50 or not(p ? 'price') or jsonb_typeof(p->'price') not in ('number','null') then raise exception 'Invalid wish' using errcode='22023';end if;
       if p->>'price' is not null and ((p->>'price') !~ '^\d+$' or (p->>'price')::bigint not between 0 and 100000000) then raise exception 'Invalid price' using errcode='22023';end if;
       if p->>'reflectUntil' is not null then if p->>'reflectUntil' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023';end if;day:=(p->>'reflectUntil')::date;end if;
     end if;
   elsif k='feedback' then
     perform public.closet_strings(p,array['outfitId','date','note']);
     if p->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023';end if;
     if not exists(select 1 from public.wear_log where user_id=caller and outfit_id=(p->>'outfitId')::uuid and worn_date=(p->>'date')::date) then raise exception 'Recorded wear required' using errcode='42501';end if;
     if (p->>'date')::date>today or length(p->>'note')>300 then raise exception 'Invalid feedback' using errcode='22023';end if;
     foreach a in array array['comfort','confidence','weather','occasion','again'] loop if jsonb_typeof(p->a) is distinct from 'boolean' then raise exception 'Invalid feedback option' using errcode='22023';end if;end loop;
     delete from public.closet_documents where user_id=caller and kind='feedback' and payload->>'outfitId'=p->>'outfitId' and payload->>'date'=p->>'date';
   else
     perform public.closet_strings(p,array['date','kind','reason']);
     if p->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023';end if;
     if p->>'kind'='lab' and ((p->>'date')::date<>today or (select count(*) from public.closet_documents where user_id=caller and kind='decision' and payload->>'kind'='lab' and payload->>'date'=today::text and id<>doc_id)>=3) then raise exception 'Daily choices complete' using errcode='22023';end if;
     perform public.closet_check_ids(p->'itemIds',caller,'item',30);
     if jsonb_array_length(p->'itemIds')=0 or coalesce(p->>'kind','') not in ('accepted','rejected','lab') or (p->>'date')::date>today or length(p->>'reason')>100 then raise exception 'Invalid decision' using errcode='22023';end if;
     if p->>'outfitId' is not null and not exists(select 1 from public.outfits where id=(p->>'outfitId')::uuid and user_id=caller) then raise exception 'Outfit unavailable' using errcode='42501';end if;
     if p->>'recipeId' is not null and not exists(select 1 from public.closet_documents where id=(p->>'recipeId')::uuid and kind='recipe' and user_id=caller) then raise exception 'Recipe unavailable' using errcode='42501';end if;
   end if;
   p:=p||jsonb_build_object('id',doc_id);
   insert into public.closet_documents(id,user_id,kind,payload) values(doc_id,caller,k,p)
     on conflict(id) do update set payload=excluded.payload,updated_at=now() where public.closet_documents.user_id=caller and public.closet_documents.kind=k;
   if k='plan' then
     select detail into d from public.closet_documents where id=doc_id and user_id=caller;
     if d is not null then
       d:=jsonb_set(d,'{days}',coalesce((select jsonb_object_agg(key,value) from jsonb_each(d->'days') where key>=p->>'date' and key<=p->>'end_date'),'{}'::jsonb));
       d:=jsonb_set(d,'{packed}',coalesce((select jsonb_agg(packed) from jsonb_array_elements_text(d->'packed') packed where
         packed in(select jsonb_array_elements_text(p->'item_ids')) or packed::uuid in(select oi.item_id from public.outfit_items oi join public.outfits o on o.id=oi.outfit_id and o.user_id=caller where
         oi.outfit_id::text in(select jsonb_array_elements_text(p->'outfit_ids')) or oi.outfit_id::text in(select jsonb_array_elements_text(d->'backupOutfitIds')) or oi.outfit_id::text in(select jsonb_array_elements_text(value) from jsonb_each(d->'days')))),'[]'::jsonb));
       update public.closet_documents set detail=d where id=doc_id and user_id=caller;
     end if;
   end if;
   if k='decision' then delete from public.closet_documents where user_id=caller and kind='decision' and id in(select id from public.closet_documents where user_id=caller and kind='decision' order by updated_at desc,id offset 500);end if;
 else raise exception 'Unknown action' using errcode='22023';end if;
 return public.closet_snapshot();
end;
$$;
revoke all on function public.closet_apply_before_identity(jsonb) from public,anon,authenticated;
commit;


-- 202610150004_account_control.sql
-- Ninth migration: owner-only data portability and confirmed, resumable account erasure.
begin;
create table public.account_erasure_intents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 session_id uuid not null, started_at timestamptz not null default now()
);
alter table public.account_erasure_intents enable row level security;
revoke all on public.account_erasure_intents from public,anon,authenticated;
create function public.account_recent_confirmation() returns boolean language sql stable security definer set search_path='' as $$
 select public.closet_session_allowed() and exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) amr
 where amr->>'method'='otp' and (amr->>'timestamp')::numeric between extract(epoch from now()-interval '10 minutes') and extract(epoch from now()+interval '1 minute'));
$$;
create function public.account_erasure_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select public.closet_session_allowed() and exists(select 1 from public.account_erasure_intents where user_id=auth.uid()
 and session_id=(auth.jwt()->>'session_id')::uuid and started_at>now()-interval '15 minutes');
$$;
create function public.account_media_manifest() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name) order by bucket_id,name),'[]') from storage.objects
 where bucket_id in ('closet-photos','mural-photos','profile-photos','profile-banners') and split_part(name,'/',1)=auth.uid()::text;
$$;
revoke all on function public.account_recent_confirmation(),public.account_media_manifest() from public,anon,authenticated;
revoke all on function public.account_erasure_allowed() from public,anon;
grant execute on function public.account_erasure_allowed() to authenticated;
create policy account_confirmed_media_erasure on storage.objects for delete to authenticated using(
 bucket_id in ('closet-photos','mural-photos','profile-photos','profile-banners') and split_part(name,'/',1)=auth.uid()::text and public.account_erasure_allowed());
create function public.account_export() returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); result jsonb; name text; rows jsonb;
begin
 perform public.require_closet_session();
 result:=jsonb_build_object('format','virtual-closet-export-v1','exportedAt',now(),'accountId',caller,
 'email',(select email from auth.users where id=caller),'studio',public.closet_snapshot(),
 'profile',(select public.identity_profile_json(p) from public.member_profiles p where user_id=caller),
 'media',public.account_media_manifest());
 foreach name in array array['social_marks','social_notebook_entries','closet_documents','closet_item_meta','closet_outfit_meta','style_members','style_messages','style_votes','atelier_members','atelier_comments'] loop
   execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from public.%I t where user_id=$1',name) into rows using caller;
   result:=result||jsonb_build_object(name,rows);
 end loop;
 result:=result||jsonb_build_object(
 'publications',coalesce((select jsonb_agg(to_jsonb(p)) from public.social_publications p where author_id=caller),'[]'),
 'follows',coalesce((select jsonb_agg(to_jsonb(p)) from public.member_follows p where follower_id=caller),'[]'),
 'blocks',coalesce((select jsonb_agg(to_jsonb(p)) from public.member_blocks p where blocker_id=caller),'[]'),
 'shares',coalesce((select jsonb_agg(to_jsonb(p)) from public.social_shares p where sender_id=caller or recipient_id=caller),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(p)) from public.social_reports p where reporter_id=caller),'[]'),
 'circles',coalesce((select jsonb_agg(to_jsonb(p)) from public.style_circles p where owner_id=caller),'[]'),
 'collections',coalesce((select jsonb_agg(to_jsonb(p)) from public.atelier_collections p where owner_id=caller),'[]'),
 'collectionEntries',coalesce((select jsonb_agg(to_jsonb(p)) from public.atelier_entries p where collection_id in(select id from public.atelier_collections where owner_id=caller)),'[]'),
 'designs',coalesce((select jsonb_agg(to_jsonb(p)) from public.atelier_designs p where owner_id=caller),'[]'));
 return result;
end;
$$;
create function public.account_begin_erasure(p_confirmation text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.require_closet_session();
 if p_confirmation is distinct from 'EXCLUIR MINHA CONTA' or not public.account_recent_confirmation() then raise exception 'RECENT_CONFIRMATION_REQUIRED' using errcode='42501';end if;
 insert into public.account_erasure_intents(user_id,session_id) values(auth.uid(),(auth.jwt()->>'session_id')::uuid)
 on conflict(user_id) do update set session_id=excluded.session_id,started_at=now();
 -- Stop public visibility and other recognized sessions before removing media.
 update public.member_profiles set discoverable=false where user_id=auth.uid();
 update public.identity_sessions set revoked=true where user_id=auth.uid() and session_id<>(auth.jwt()->>'session_id')::uuid;
 return public.account_media_manifest();
end;
$$;
create function public.account_finish_erasure() returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.account_erasure_allowed() then raise exception 'CONFIRMATION_REQUIRED' using errcode='42501';end if;
 if jsonb_array_length(public.account_media_manifest())>0 then raise exception 'MEDIA_REMAINING' using errcode='55000';end if;
 delete from auth.users where id=auth.uid();
end;
$$;
revoke all on function public.account_export(),public.account_begin_erasure(text),public.account_finish_erasure() from public,anon;
grant execute on function public.account_export(),public.account_begin_erasure(text),public.account_finish_erasure() to authenticated;
commit;
