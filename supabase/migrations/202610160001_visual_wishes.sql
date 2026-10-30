-- Tenth migration: private visual wishes, confirmed style traits and editor references.
begin;
create function public.visual_style_ready() returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform public.require_closet_session();
 return true;
end;$$;
revoke all on function public.visual_style_ready() from public,anon;
grant execute on function public.visual_style_ready() to authenticated;

create function public.visual_check_traits(v jsonb) returns void
language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(v) is distinct from 'object'
 or coalesce(v->>'volume','') not in ('unknown','slim','straight','roomy')
 or coalesce(v->>'texture','') not in ('unknown','smooth','denim','knit','linen','leather','print')
 or coalesce(v->>'occasion','') not in ('any','casual','smart','active')
 or (v - array['volume','texture','occasion']) <> '{}'::jsonb
 then raise exception 'INVALID_STYLE_TRAITS' using errcode='22023';end if;
end;$$;
revoke all on function public.visual_check_traits(jsonb) from public,anon,authenticated;

alter function public.closet_apply_before_identity(jsonb) rename to closet_apply_before_visuals;
create function public.closet_apply_before_identity(p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); a text:=p_action->>'action'; p jsonb; old jsonb; media jsonb; ref uuid; photo text; doc_id uuid;
begin
 perform public.require_closet_session();
 if a='wish' then
   p:=p_action->'wish';
   doc_id:=coalesce((p->>'id')::uuid,gen_random_uuid());
   -- Serialize updates, including first inserts, so revisions cannot be lost.
   perform 1 from auth.users where id=caller for update;
   select payload into old from public.closet_documents where id=doc_id and user_id=caller and kind='wish';
   if p ? 'revision' and (jsonb_typeof(p->'revision') is distinct from 'number' or (p->>'revision') !~ '^\d+$' or (p->>'revision')::bigint <> coalesce((old->>'revision')::bigint,0))
   then raise exception 'CONFLICT' using errcode='40001';end if;
   -- Once versioned, reject unversioned older clients too.
   if old ? 'revision' and not p ? 'revision' then raise exception 'CONFLICT' using errcode='40001';end if;
   if p ? 'styling' then perform public.visual_check_traits(p->'styling');end if;
   if p ? 'media' then
     media:=p->'media';
     if jsonb_typeof(media) is distinct from 'object' or (media-array['publicationId','photoPath'])<>'{}'::jsonb then raise exception 'INVALID_MEDIA' using errcode='22023';end if;
     if media->'publicationId' is not null and jsonb_typeof(media->'publicationId') not in ('string','null') then raise exception 'INVALID_MEDIA' using errcode='22023';end if;
     if media->'photoPath' is not null and jsonb_typeof(media->'photoPath') not in ('string','null') then raise exception 'INVALID_MEDIA' using errcode='22023';end if;
     ref:=(media->>'publicationId')::uuid;
     if ref is not null and not exists(select 1 from public.social_publications v where v.id=ref and public.social_visible(v)) then raise exception 'REFERENCE_UNAVAILABLE' using errcode='42501';end if;
     photo:=media->>'photoPath';
     if photo is not null and (photo not like caller::text||'/outfits/%' or photo like '%..%' or not exists(select 1 from storage.objects where bucket_id='closet-photos' and name=photo)) then raise exception 'PHOTO_UNAVAILABLE' using errcode='42501';end if;
   end if;
   p:=p||jsonb_build_object('id',doc_id,'revision',coalesce((old->>'revision')::bigint,0)+1);
   p_action:=jsonb_set(p_action,'{wish}',p);
 elsif a='item_detail' and (p_action->'detail') ? 'styling' then
   perform public.visual_check_traits(p_action->'detail'->'styling');
 end if;
 return public.closet_apply_before_visuals(p_action);
end;$$;
revoke all on function public.closet_apply_before_identity(jsonb) from public,anon,authenticated;
revoke all on function public.closet_apply_before_visuals(jsonb) from public,anon,authenticated;

create or replace function public.atelier_action(p_action jsonb default '{"action":"list"}') returns jsonb
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
     elsif entry->>'kind'='wish' then
       if not exists(select 1 from public.closet_documents where id=ref and user_id=caller and kind='wish') then raise exception 'WISH_UNAVAILABLE' using errcode='42501';end if;
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
