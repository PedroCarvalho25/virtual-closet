begin;
create table public.style_circles(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,title text not null check(length(btrim(title)) between 1 and 80),created_at timestamptz not null default now());
create table public.style_members(circle_id uuid references public.style_circles(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,display_name text not null check(length(btrim(display_name)) between 1 and 80),primary key(circle_id,user_id));
create table public.style_invites(token uuid primary key default gen_random_uuid(),circle_id uuid not null references public.style_circles(id) on delete cascade,expires_at timestamptz not null default(now()+interval '7 days'));
create table public.style_messages(id uuid primary key default gen_random_uuid(),circle_id uuid not null references public.style_circles(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('request','comment','recipe','poll')),body text not null check(length(btrim(body)) between 1 and 500),cards jsonb not null default '[]',parent_id uuid references public.style_messages(id) on delete cascade,created_at timestamptz not null default now());
create table public.style_votes(message_id uuid references public.style_messages(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,choice integer not null check(choice in(0,1)),primary key(message_id,user_id));
create index style_members_user on public.style_members(user_id,circle_id);
create index style_messages_circle on public.style_messages(circle_id,created_at desc,id);
alter table public.style_circles enable row level security;alter table public.style_members enable row level security;alter table public.style_invites enable row level security;alter table public.style_messages enable row level security;alter table public.style_votes enable row level security;
revoke all on public.style_circles,public.style_members,public.style_invites,public.style_messages,public.style_votes from public,anon,authenticated;
grant select on public.style_circles,public.style_members,public.style_messages,public.style_votes to authenticated;
create function public.style_is_member(p_circle uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.style_members where circle_id=p_circle and user_id=auth.uid())$$;
revoke all on function public.style_is_member(uuid) from public,anon;grant execute on function public.style_is_member(uuid) to authenticated;
create policy circles_read on public.style_circles for select to authenticated using(public.style_is_member(id));
create policy members_read on public.style_members for select to authenticated using(public.style_is_member(circle_id));
create policy messages_read on public.style_messages for select to authenticated using(public.style_is_member(circle_id));
create policy votes_read on public.style_votes for select to authenticated using(exists(select 1 from public.style_messages m where m.id=message_id and public.style_is_member(m.circle_id)));
create function public.circles_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object('circles',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'ownerId',c.owner_id,'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.display_name)) from public.style_members m where m.circle_id=c.id),'messages',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'userId',r.user_id,'kind',r.kind,'body',r.body,'cards',r.cards,'parentId',r.parent_id,'createdAt',r.created_at,'votes',coalesce((select jsonb_agg(jsonb_build_object('userId',v.user_id,'choice',v.choice)) from public.style_votes v where v.message_id=r.id),'[]'::jsonb)) order by r.created_at desc,r.id) from (select * from public.style_messages where circle_id=c.id order by created_at desc,id limit 100)r),'[]'::jsonb))) from public.style_circles c where public.style_is_member(c.id)),'[]'::jsonb));$$;
revoke all on function public.circles_snapshot() from public,anon;grant execute on function public.circles_snapshot() to authenticated;
create function public.circle_action(p_action jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();a text:=p_action->>'action';cid uuid;token uuid;owner uuid;msg public.style_messages%rowtype;cards jsonb:='[]'::jsonb;card jsonb;oid uuid;mid uuid;display text;result jsonb;invite public.style_invites%rowtype;
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_action is null or octet_length(p_action::text)>5000 then raise exception 'Invalid request' using errcode='22023';end if;
 if a='create' then
   display:=btrim(p_action->>'name');if coalesce(length(display),0) not between 1 and 80 then raise exception 'Your name is required' using errcode='22023';end if;
   if (select count(*) from public.style_members where user_id=caller)>=20 then raise exception 'Circle limit reached' using errcode='22023';end if;
   insert into public.style_circles(owner_id,title) values(caller,btrim(p_action->>'title')) returning id into cid;
   insert into public.style_members values(cid,caller,display);
 elsif a='join' then
   select * into invite from public.style_invites where style_invites.token=(p_action->>'token')::uuid and expires_at>now() for update;
   if not found then raise exception 'Invite expired or unavailable' using errcode='22023';end if;
   cid:=invite.circle_id;perform id from public.style_circles where id=cid for update;
   if (select count(*) from public.style_members where circle_id=cid)>=16 or (select count(*) from public.style_members where user_id=caller)>=20 then raise exception 'Circle limit reached' using errcode='22023';end if;
   insert into public.style_members values(cid,caller,btrim(p_action->>'name')) on conflict do nothing;
   delete from public.style_invites where style_invites.token=invite.token;
 else
   cid:=(p_action->>'circleId')::uuid;select owner_id into owner from public.style_circles where id=cid for update;
   if owner is null or not public.style_is_member(cid) then raise exception 'Circle unavailable' using errcode='42501';end if;
   if a='invite' then
     if owner<>caller then raise exception 'Owner required' using errcode='42501';end if;
     delete from public.style_invites where circle_id=cid;
     insert into public.style_invites(circle_id) values(cid) returning style_invites.token into token;
   elsif a='revoke_invite' then
     if owner<>caller then raise exception 'Owner required' using errcode='42501';end if;delete from public.style_invites where circle_id=cid;
   elsif a='leave' then
     if owner=caller then raise exception 'The owner must delete the circle' using errcode='22023';end if;
     delete from public.style_members where circle_id=cid and user_id=caller;
     delete from public.style_votes where user_id=caller and message_id in(select id from public.style_messages where circle_id=cid);
   elsif a='remove_member' then
     if owner<>caller or (p_action->>'userId')::uuid=owner then raise exception 'Owner required' using errcode='42501';end if;
     delete from public.style_members where circle_id=cid and user_id=(p_action->>'userId')::uuid;
     delete from public.style_votes where user_id=(p_action->>'userId')::uuid and message_id in(select id from public.style_messages where circle_id=cid);
   elsif a='delete_circle' then
     if owner<>caller then raise exception 'Owner required' using errcode='42501';end if;delete from public.style_circles where id=cid;
   elsif a='message' then
     if coalesce(p_action->>'kind','') not in ('request','comment','recipe','poll') then raise exception 'Invalid message' using errcode='22023';end if;
     if p_action->>'parentId' is not null and not exists(select 1 from public.style_messages where id=(p_action->>'parentId')::uuid and circle_id=cid) then raise exception 'Parent unavailable' using errcode='42501';end if;
     if p_action->>'kind' in ('recipe','poll') then
       perform public.closet_check_ids(p_action->'outfitIds',caller,'outfit',2);
       if jsonb_array_length(p_action->'outfitIds')<>(case when p_action->>'kind'='poll' then 2 else 1 end) then raise exception 'Choose the outfits' using errcode='22023';end if;
       for oid in select value::uuid from jsonb_array_elements_text(p_action->'outfitIds') loop
         -- Only this explicit recipe snapshot is shared. No paths, prices, item IDs or dates.
         select jsonb_build_object('title',coalesce(o.name,'Meu look'),'slots',(select jsonb_agg(jsonb_build_object('role',case when i.category::text in ('camiseta','regata','camisa','polo') then 'top' when i.category::text in ('calca','bermuda','jorts') then 'bottom' when i.category='tenis' then 'shoes' when i.category::text like 'bone_%' then 'accessory' else 'layer' end,'category',i.category,'color',i.color) order by i.id) from public.outfit_items oi join public.wardrobe_items i on i.id=oi.item_id and i.user_id=caller where oi.outfit_id=o.id)) into card from public.outfits o where o.id=oid and o.user_id=caller;
         cards:=cards||jsonb_build_array(card);
       end loop;
     end if;
     insert into public.style_messages(circle_id,user_id,kind,body,cards,parent_id) values(cid,caller,p_action->>'kind',btrim(p_action->>'body'),cards,(p_action->>'parentId')::uuid);
   elsif a in ('delete_message','vote') then
     mid:=(p_action->>'messageId')::uuid;select * into msg from public.style_messages where id=mid and circle_id=cid;
     if not found then raise exception 'Message unavailable' using errcode='42501';end if;
     if a='delete_message' then
       if msg.user_id<>caller and owner<>caller then raise exception 'Author required' using errcode='42501';end if;delete from public.style_messages where id=mid;
     else
       if msg.kind<>'poll' then raise exception 'Not a poll' using errcode='22023';end if;
       insert into public.style_votes(message_id,user_id,choice) values(mid,caller,(p_action->>'choice')::integer) on conflict(message_id,user_id) do update set choice=excluded.choice;
     end if;
   else raise exception 'Unknown action' using errcode='22023';end if;
 end if;
 result:=public.circles_snapshot();if token is not null then result:=result||jsonb_build_object('invite',token);end if;return result;
end;
$$;
revoke all on function public.circle_action(jsonb) from public,anon;grant execute on function public.circle_action(jsonb) to authenticated;
commit;
