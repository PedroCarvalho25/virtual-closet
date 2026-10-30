-- Incremental evolution. Apply AFTER 202610050001_initial.sql. Never rerun the initial schema.
begin;
create table public.closet_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{"name":"","feeling":"comfortable","thermal":"neutral","environment":"outside","boldness":1,"avoidRecent":true,"challenges":true,"noBuy":false,"city":""}'::jsonb
);
create table public.closet_item_meta (
  item_id uuid primary key references public.wardrobe_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  price_cents integer check(price_cents between 0 and 100000000),
  currency text not null default 'BRL' check(currency='BRL'),
  favorite boolean not null default false,
  detail jsonb
);
create table public.closet_outfit_meta (
  outfit_id uuid primary key references public.outfits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite boolean not null default false
);
-- Typed documents allow the personal library to evolve without storing private arrays on a profile.
-- Writes are RPC-only. The RPC validates all references and entity-specific fields.
create table public.closet_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('plan','recipe','wish','feedback','decision')),
  payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=30000),
  detail jsonb,
  updated_at timestamptz not null default now()
);
create index closet_item_meta_owner on public.closet_item_meta(user_id);
create index closet_outfit_meta_owner on public.closet_outfit_meta(user_id);
create index closet_documents_owner_kind on public.closet_documents(user_id,kind,updated_at desc);
alter table public.closet_profiles enable row level security;
alter table public.closet_item_meta enable row level security;
alter table public.closet_outfit_meta enable row level security;
alter table public.closet_documents enable row level security;
revoke all on public.closet_profiles,public.closet_item_meta,public.closet_outfit_meta,public.closet_documents from public,anon,authenticated;
grant select on public.closet_profiles,public.closet_item_meta,public.closet_outfit_meta,public.closet_documents to authenticated;
create policy profile_read on public.closet_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy item_meta_read on public.closet_item_meta for select to authenticated using(user_id=(select auth.uid()));
create policy outfit_meta_read on public.closet_outfit_meta for select to authenticated using(user_id=(select auth.uid()));
create policy documents_read on public.closet_documents for select to authenticated using(user_id=(select auth.uid()));

create function public.closet_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$
with own_items as (
 select i.*,d.last_worn_date from public.wardrobe_items i left join public.item_last_worn d on d.item_id=i.id where i.user_id=auth.uid()
), own_outfits as (
 select o.*,d.last_worn_date,coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.outfit_items oi join own_items i on i.id=oi.item_id where oi.outfit_id=o.id),'[]'::jsonb) as items
 from public.outfits o left join public.outfit_last_worn d on d.outfit_id=o.id where o.user_id=auth.uid()
), docs as (select * from public.closet_documents where user_id=auth.uid())
select jsonb_build_object(
 'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc,i.id) from own_items i),'[]'::jsonb),
 'outfits',coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc,o.id) from own_outfits o),'[]'::jsonb),
 'wear',coalesce((select jsonb_agg(to_jsonb(w) order by w.worn_date desc) from public.wear_log w where w.user_id=auth.uid()),'[]'::jsonb),
 'prices',coalesce((select jsonb_object_agg(item_id::text,price_cents) from public.closet_item_meta where user_id=auth.uid() and price_cents is not null),'{}'::jsonb),
 'favorite_items',coalesce((select jsonb_agg(item_id) from public.closet_item_meta where user_id=auth.uid() and favorite),'[]'::jsonb),
 'favorite_outfits',coalesce((select jsonb_agg(outfit_id) from public.closet_outfit_meta where user_id=auth.uid() and favorite),'[]'::jsonb),
 'plans',coalesce((select jsonb_agg(payload order by payload->>'date',id) from docs where kind='plan'),'[]'::jsonb),
 'evolution',jsonb_build_object(
   'profile',coalesce((select profile from public.closet_profiles where user_id=auth.uid()),'{"name":"","feeling":"comfortable","thermal":"neutral","environment":"outside","boldness":1,"avoidRecent":true,"challenges":true,"noBuy":false,"city":""}'::jsonb),
   'details',coalesce((select jsonb_object_agg(item_id::text,detail) from public.closet_item_meta where user_id=auth.uid() and detail is not null),'{}'::jsonb),
   'recipes',coalesce((select jsonb_agg(payload order by updated_at desc,id) from docs where kind='recipe'),'[]'::jsonb),
   'wishes',coalesce((select jsonb_agg(payload order by updated_at desc,id) from docs where kind='wish'),'[]'::jsonb),
   'feedback',coalesce((select jsonb_agg(payload order by updated_at desc,id) from docs where kind='feedback'),'[]'::jsonb),
   'decisions',coalesce((select jsonb_agg(payload order by updated_at desc,id) from docs where kind='decision'),'[]'::jsonb),
   'planDetails',coalesce((select jsonb_object_agg(id::text,detail) from docs where kind='plan' and detail is not null),'{}'::jsonb)
 )
);
$$;
revoke all on function public.closet_snapshot() from public,anon;
grant execute on function public.closet_snapshot() to authenticated;

-- Helpers are not callable by clients. Explicit owner checks also apply inside SECURITY DEFINER.
create function public.closet_check_ids(values_json jsonb, owner_id uuid, entity text, max_count integer) returns void
language plpgsql security definer set search_path='' as $$
declare ids uuid[]; n integer;
begin
 if values_json is null or jsonb_typeof(values_json)<>'array' or jsonb_array_length(values_json)>max_count then raise exception 'Invalid selection' using errcode='22023';end if;
 select coalesce(array_agg(value::uuid),'{}'::uuid[]) into ids from jsonb_array_elements_text(values_json);
 if exists(select 1 from unnest(ids) x where x is null) or cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception 'Duplicate selection' using errcode='22023';end if;
 if entity='item' then select count(*) into n from public.wardrobe_items where user_id=owner_id and id=any(ids);
 elsif entity='outfit' then select count(*) into n from public.outfits where user_id=owner_id and id=any(ids);
 else raise exception 'Invalid entity';end if;
 if n<>cardinality(ids) then raise exception 'Selection unavailable' using errcode='42501';end if;
end;
$$;
revoke all on function public.closet_check_ids(jsonb,uuid,text,integer) from public,anon,authenticated;

create function public.closet_strings(p jsonb, keys text[]) returns void language plpgsql security invoker set search_path='' as $$
declare key text;
begin
 foreach key in array keys loop
   if jsonb_typeof(p->key) is distinct from 'string' then raise exception 'Text field required: %',key using errcode='22023';end if;
 end loop;
end;$$;
revoke all on function public.closet_strings(jsonb,text[]) from public,anon,authenticated;

create function public.closet_apply(p_action jsonb) returns jsonb
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
         if v->>'role' <> (case when v->>'category' in ('camiseta','regata','camisa','polo') then 'top' when v->>'category' in ('calca','bermuda','jorts') then 'bottom' when v->>'category'='tenis' then 'shoes' when v->>'category' like 'bone_%' then 'accessory' else 'layer' end) then raise exception 'Invalid role for category' using errcode='22023';end if;
         if coalesce(v->>'role','') not in ('top','bottom','layer','shoes','accessory') or length(v->>'color')>50 then raise exception 'Invalid slot' using errcode='22023';end if;
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
revoke all on function public.closet_apply(jsonb) from public,anon;
grant execute on function public.closet_apply(jsonb) to authenticated;
commit;
