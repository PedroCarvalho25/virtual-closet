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
