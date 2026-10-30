-- Mural: explicit publications, separate from the private closet and diary.
begin;
create function public.social_search(title text, caption text, tags text[], colors text[]) returns tsvector
language sql immutable set search_path='' as $$
 select to_tsvector('portuguese',translate(lower(title||' '||caption||' '||array_to_string(tags,' ')||' '||array_to_string(colors,' ')),
 'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'));
$$;
create table public.social_publications (
 id uuid primary key default gen_random_uuid(),
 author_id uuid references public.member_profiles(user_id) on delete cascade,
 curated boolean not null default false,
 title text not null check(length(btrim(title)) between 1 and 100),
 caption text not null default '' check(length(caption)<=1200),
 tags text[] not null default '{}' check(cardinality(tags)<=12 and length(tags::text)<=400),
 colors text[] not null default '{}' check(cardinality(colors)<=5 and colors <@ array['verde','azul','rosa','vermelho','laranja','amarelo','bege','marrom','preto','branco','cinza']),
 full_path text not null unique, thumb_path text not null unique,
 width integer not null check(width between 1 and 12000), height integer not null check(height between 1 and 12000),
 credit text not null default '' check(length(credit)<=160), source_url text,
 created_at timestamptz not null default now(),
 search_document tsvector generated always as (public.social_search(title,caption,tags,colors)) stored,
 check ((curated and author_id is null and full_path like 'seed/%' and thumb_path like 'seed/%' and length(btrim(credit))>0 and source_url like 'https://%') or
   (not curated and author_id is not null and full_path ~ ('^'||author_id::text||'/[a-f0-9-]+/full\.jpg$') and
    thumb_path=replace(full_path,'/full.jpg','/thumb.jpg') and source_url is null))
);
create index social_publications_order on public.social_publications(created_at desc,id desc);
create index social_publications_author on public.social_publications(author_id,created_at desc,id desc);
create index social_publications_search on public.social_publications using gin(search_document);
create index social_publications_colors on public.social_publications using gin(colors);
create table public.social_marks (
 user_id uuid not null references public.member_profiles(user_id) on delete cascade,
 publication_id uuid not null references public.social_publications(id) on delete cascade,
 kind text not null check(kind in ('like','save','repost','hide')),
 created_at timestamptz not null default now(), primary key(user_id,publication_id,kind)
);
create index social_marks_post on public.social_marks(publication_id,kind,created_at desc);
create table public.social_shares (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.member_profiles(user_id) on delete cascade,
 recipient_id uuid not null references public.member_profiles(user_id) on delete cascade,
 publication_id uuid not null references public.social_publications(id) on delete cascade,
 created_at timestamptz not null default now(), read_at timestamptz,
 unique(sender_id,recipient_id,publication_id),check(sender_id<>recipient_id)
);
create index social_shares_inbox on public.social_shares(recipient_id,created_at desc,id desc);
create table public.social_reports (
 reporter_id uuid not null references public.member_profiles(user_id) on delete cascade,
 publication_id uuid not null references public.social_publications(id) on delete cascade,
 reason text not null check(reason in ('inappropriate','rights','spam')),
 created_at timestamptz not null default now(), primary key(reporter_id,publication_id)
);
alter table public.social_publications enable row level security;
alter table public.social_marks enable row level security;
alter table public.social_shares enable row level security;
alter table public.social_reports enable row level security;
revoke all on public.social_publications,public.social_marks,public.social_shares,public.social_reports from public,anon,authenticated;

create function public.social_friends(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select a<>b and exists(select 1 from public.member_follows where follower_id=a and following_id=b)
 and exists(select 1 from public.member_follows where follower_id=b and following_id=a)
 and not exists(select 1 from public.member_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
create function public.social_visible(p public.social_publications) returns boolean
language sql stable security definer set search_path='' as $$
 select public.closet_session_allowed() and (p.curated or public.profile_is_visible(p.author_id));
$$;
create function public.social_author(target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',user_id,'username',username,'firstName',first_name,'lastName',last_name,'avatarPath',avatar_path,'tone',tone)
 from public.member_profiles where user_id=target;
$$;
create function public.social_json(p public.social_publications) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'title',p.title,'caption',p.caption,'tags',p.tags,'colors',p.colors,
 'fullPath',p.full_path,'thumbPath',p.thumb_path,'width',p.width,'height',p.height,'createdAt',p.created_at,
 'author',public.social_author(p.author_id),'curated',p.curated,'credit',p.credit,'sourceUrl',p.source_url,
 'friend',coalesce(public.social_friends(auth.uid(),p.author_id),false),'mine',coalesce(p.author_id=auth.uid(),false),
 'liked',exists(select 1 from public.social_marks where publication_id=p.id and user_id=auth.uid() and kind='like'),
 'saved',exists(select 1 from public.social_marks where publication_id=p.id and user_id=auth.uid() and kind='save'),
 'reposted',exists(select 1 from public.social_marks where publication_id=p.id and user_id=auth.uid() and kind='repost'),
 'likes',(select count(*) from public.social_marks where publication_id=p.id and kind='like'),
 'reposts',(select count(*) from public.social_marks where publication_id=p.id and kind='repost'),
 'reposters',coalesce((select jsonb_agg(public.social_author(r.user_id)) from (
 select m.user_id from public.social_marks m where m.publication_id=p.id and m.kind='repost'
 and public.profile_is_visible(m.user_id) and (m.user_id=auth.uid() or public.social_friends(auth.uid(),m.user_id))
 order by m.created_at desc,m.user_id limit 3) r),'[]'::jsonb));
$$;

create function public.social_query(p_query jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid(); query_kind text:=coalesce(p_query->>'kind','feed'); mode text:=coalesce(p_query->>'mode','all');
 rows jsonb; next_cursor jsonb; found public.social_publications; term text; offset_count integer;
begin
 perform public.require_closet_session();
 if query_kind='detail' then
   select * into found from public.social_publications where id=(p_query->>'id')::uuid;
   if found.id is null or not public.social_visible(found) then return null;end if;
   return public.social_json(found);
 elsif query_kind='friends' then
   offset_count:=greatest(0,least(coalesce((p_query->>'offset')::integer,0),2000));
   return coalesce((select jsonb_agg(public.social_author(t.user_id)) from (select user_id from public.member_profiles
   where public.social_friends(caller,user_id) and public.profile_is_visible(user_id)
   order by username,user_id limit 30 offset offset_count) t),'[]'::jsonb);
 elsif query_kind='inbox' then
   return coalesce((select jsonb_agg(t.data order by t.created_at desc,t.id desc) from (
   select s.id,s.created_at,jsonb_build_object('id',s.id,'sender',public.social_author(s.sender_id),
   'publication',public.social_json(p),'createdAt',s.created_at,'read',s.read_at is not null) data
   from public.social_shares s join public.social_publications p on p.id=s.publication_id
   where s.recipient_id=caller and public.profile_is_visible(s.sender_id) and public.social_friends(caller,s.sender_id) and public.social_visible(p)
   and (p_query->'cursor' is null or p_query->'cursor'='null'::jsonb or (s.created_at,s.id)<((p_query->'cursor'->>'at')::timestamptz,(p_query->'cursor'->>'id')::uuid))
   order by s.created_at desc,s.id desc limit 30) t),'[]'::jsonb);
 elsif query_kind<>'feed' then raise exception 'INVALID_QUERY' using errcode='22023';end if;
 if mode not in ('all','friends','saved','mine','reposts') then raise exception 'INVALID_QUERY' using errcode='22023';end if;
 term:=left(btrim(coalesce(p_query->>'search','')),100);
 with eligible as (
   select p.*,greatest(p.created_at,coalesce((select max(m.created_at) from public.social_marks m
     where m.publication_id=p.id and m.kind='repost' and public.profile_is_visible(m.user_id)
     and (public.social_friends(caller,m.user_id) or m.user_id=caller)),p.created_at)) as ranked_at
   from public.social_publications p where public.social_visible(p)
   and not exists(select 1 from public.social_marks where publication_id=p.id and user_id=caller and kind='hide')
   and (nullif(p_query->>'author','') is null or
     (mode<>'reposts' and p.author_id=(p_query->>'author')::uuid) or
     (mode='reposts' and public.profile_is_visible((p_query->>'author')::uuid) and exists(select 1 from public.social_marks where publication_id=p.id and user_id=(p_query->>'author')::uuid and kind='repost')))
   and (mode='all' or (mode='mine' and p.author_id=caller) or
     (mode='saved' and exists(select 1 from public.social_marks where publication_id=p.id and user_id=caller and kind='save')) or
     (mode='reposts' and (nullif(p_query->>'author','') is not null or exists(select 1 from public.social_marks where publication_id=p.id and user_id=caller and kind='repost'))) or
     (mode='friends' and (public.social_friends(caller,p.author_id) or exists(select 1 from public.social_marks where publication_id=p.id and kind='repost' and public.social_friends(caller,user_id) and public.profile_is_visible(user_id)))))
   and (nullif(p_query->>'color','') is null or colors @> array[p_query->>'color'])
   and (term='' or p.search_document @@ websearch_to_tsquery('portuguese',translate(lower(term),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')))
 ), page as (
   select * from eligible where (p_query->'cursor' is null or p_query->'cursor'='null'::jsonb or
   (ranked_at,id)<((p_query->'cursor'->>'at')::timestamptz,(p_query->'cursor'->>'id')::uuid))
   order by ranked_at desc,id desc limit 13
 ), batch as (select * from page order by ranked_at desc,id desc limit 12)
 select coalesce((select jsonb_agg(public.social_json(p) order by b.ranked_at desc,b.id desc)
 from batch b join public.social_publications p on p.id=b.id),'[]'::jsonb),
 case when (select count(*) from page)>12 then (select jsonb_build_object('at',ranked_at,'id',id) from batch order by ranked_at,id limit 1) else null end
 into rows,next_cursor;
 return jsonb_build_object('items',rows,'next',next_cursor);
end;
$$;

create function public.social_action(p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); action text:=p_action->>'action'; target uuid; found public.social_publications;
 mark_kind text; media text; thumb text; recipient uuid; result_id uuid;
begin
 perform public.require_closet_session();
 if not exists(select 1 from public.member_profiles where user_id=caller) then raise exception 'PROFILE_REQUIRED' using errcode='42501';end if;
 if action='publish' then
   if not exists(select 1 from public.member_profiles where user_id=caller and discoverable) then raise exception 'PUBLIC_PROFILE_REQUIRED' using errcode='22023';end if;
   perform pg_advisory_xact_lock(hashtextextended(caller::text,714));
   media:=p_action->>'fullPath';thumb:=p_action->>'thumbPath';
   if media is null or thumb is null or media !~ ('^'||caller::text||'/[a-f0-9-]+/full\.jpg$') or thumb<>replace(media,'/full.jpg','/thumb.jpg') then raise exception 'INVALID_MEDIA' using errcode='22023';end if;
   if not exists(select 1 from storage.objects where bucket_id='mural-photos' and name=media) or
      not exists(select 1 from storage.objects where bucket_id='mural-photos' and name=thumb) then raise exception 'MEDIA_NOT_UPLOADED' using errcode='22023';end if;
   -- Retried publication of the same upload returns the existing record.
   select * into found from public.social_publications where full_path=media and author_id=caller;
   if found.id is not null then return public.social_json(found);end if;
   if (select count(*) from public.social_publications where author_id=caller and created_at>now()-interval '1 day')>=30 then raise exception 'PUBLISH_LIMIT' using errcode='22023';end if;
   insert into public.social_publications(author_id,title,caption,tags,colors,full_path,thumb_path,width,height)
   values(caller,btrim(p_action->>'title'),coalesce(p_action->>'caption',''),
     array(select jsonb_array_elements_text(coalesce(p_action->'tags','[]'))),array(select jsonb_array_elements_text(coalesce(p_action->'colors','[]'))),
     media,thumb,(p_action->>'width')::integer,(p_action->>'height')::integer) returning * into found;
   return public.social_json(found);
 elsif action='read' then
   update public.social_shares set read_at=coalesce(read_at,now()) where id=(p_action->>'id')::uuid and recipient_id=caller;
   return 'null'::jsonb;
 end if;
 target:=(p_action->>'id')::uuid;
 select * into found from public.social_publications where id=target;
 if found.id is null or not public.social_visible(found) then raise exception 'PUBLICATION_UNAVAILABLE' using errcode='42501';end if;
 if action='delete' then
   if found.author_id is distinct from caller then raise exception 'NOT_OWNER' using errcode='42501';end if;
   delete from public.social_publications where id=target;return 'null'::jsonb;
 elsif action in ('like','save','repost','hide') then
   if jsonb_typeof(p_action->'active') is distinct from 'boolean' then raise exception 'INVALID_ACTION' using errcode='22023';end if;
   mark_kind:=action;
   if p_action->'active'='true'::jsonb then
     if action='repost' and not exists(select 1 from public.member_profiles where user_id=caller and discoverable) then raise exception 'PUBLIC_PROFILE_REQUIRED' using errcode='22023';end if;
     insert into public.social_marks(user_id,publication_id,kind) values(caller,target,mark_kind) on conflict do nothing;
   else delete from public.social_marks where user_id=caller and publication_id=target and kind=mark_kind;end if;
 elsif action='share' then
   recipient:=(p_action->>'recipient')::uuid;
   if not public.social_friends(caller,recipient) or not public.profile_is_visible(recipient) then raise exception 'FRIEND_REQUIRED' using errcode='42501';end if;
   if not found.curated and (not exists(select 1 from public.member_profiles where user_id=found.author_id and discoverable)
     or exists(select 1 from public.member_blocks where (blocker_id=recipient and blocked_id=found.author_id) or (blocked_id=recipient and blocker_id=found.author_id))) then raise exception 'PUBLICATION_UNAVAILABLE' using errcode='42501';end if;
   perform pg_advisory_xact_lock(hashtextextended(caller::text,715));
   if exists(select 1 from public.social_shares where sender_id=caller and recipient_id=recipient and publication_id=target) then return jsonb_build_object('sent',true);end if;
   if (select count(*) from public.social_shares where sender_id=caller and created_at>now()-interval '1 hour')>=60 then raise exception 'SHARE_LIMIT' using errcode='22023';end if;
   insert into public.social_shares(sender_id,recipient_id,publication_id) values(caller,recipient,target) on conflict do nothing returning id into result_id;
   return jsonb_build_object('sent',true);
 elsif action='report' then
   insert into public.social_reports(reporter_id,publication_id,reason) values(caller,target,p_action->>'reason') on conflict do nothing;
   insert into public.social_marks(user_id,publication_id,kind) values(caller,target,'hide') on conflict do nothing;
   return 'null'::jsonb;
 else raise exception 'INVALID_ACTION' using errcode='22023';end if;
 return public.social_json(found);
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mural-photos','mural-photos',false,12582912,array['image/jpeg']);
create function public.social_photo_readable(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.closet_session_allowed() and exists(select 1 from public.social_publications p
 where (p.full_path=path or p.thumb_path=path) and public.social_visible(p));
$$;
create policy mural_upload on storage.objects for insert to authenticated with check(bucket_id='mural-photos'
 and public.closet_session_allowed() and name ~ ('^'||auth.uid()::text||'/[a-f0-9-]+/(full|thumb)\.jpg$'));
create policy mural_read on storage.objects for select to authenticated using(bucket_id='mural-photos' and
 (public.social_photo_readable(name) or (public.closet_session_allowed() and (storage.foldername(name))[1]=auth.uid()::text)));
create function public.social_photo_unlinked(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.social_publications p where p.full_path=path or p.thumb_path=path);
$$;
create policy mural_remove on storage.objects for delete to authenticated using(bucket_id='mural-photos' and
 public.closet_session_allowed() and (storage.foldername(name))[1]=auth.uid()::text
 and public.social_photo_unlinked(name));

-- Profile post counts now mean explicit mural publications, never private diary entries.
create or replace function public.identity_counts(target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('following',(select count(*) from public.member_follows where follower_id=target),
 'followers',(select count(*) from public.member_follows where following_id=target),
 'posts',(select count(*) from public.social_publications where author_id=target));
$$;
revoke all on function public.social_search(text,text,text[],text[]),public.social_friends(uuid,uuid),public.social_visible(public.social_publications),
 public.social_author(uuid),public.social_json(public.social_publications),public.social_query(jsonb),public.social_action(jsonb),public.social_photo_readable(text),public.social_photo_unlinked(text) from public,anon,authenticated;
grant execute on function public.social_query(jsonb),public.social_action(jsonb),public.social_photo_readable(text),public.social_photo_unlinked(text) to authenticated;

-- Curated Unsplash catalog: full assets and thumbnails ship with the app.
insert into public.social_publications(id,curated,title,tags,colors,full_path,thumb_path,width,height,credit,source_url,created_at) values('99999999-9999-4999-8999-000000000001',true,'Urbano em amarelo',array['urbano','outfit','rua'],array['amarelo','preto'],'seed/street/full.jpg','seed/street/thumb.jpg',2124,2940,'Unsplash · foto 1515886657613-9f3515b0c78f','https://images.unsplash.com/photo-1515886657613-9f3515b0c78f','2026-10-01T12:59:00Z');
insert into public.social_publications(id,curated,title,tags,colors,full_path,thumb_path,width,height,credit,source_url,created_at) values('99999999-9999-4999-8999-000000000002',true,'Texturas de tricô',array['trico','texturas','inverno'],array['bege','branco'],'seed/knit/full.jpg','seed/knit/thumb.jpg',2200,3158,'Unsplash · foto 1434389677669-e08b4cac3105','https://images.unsplash.com/photo-1434389677669-e08b4cac3105','2026-10-01T12:58:00Z');
insert into public.social_publications(id,curated,title,tags,colors,full_path,thumb_path,width,height,credit,source_url,created_at) values('99999999-9999-4999-8999-000000000003',true,'Tênis em tons terrosos',array['tenis','acessorios','casual'],array['marrom'],'seed/sneakers/full.jpg','seed/sneakers/thumb.jpg',2200,1572,'Unsplash · foto 1549298916-b41d501d3772','https://images.unsplash.com/photo-1549298916-b41d501d3772','2026-10-01T12:57:00Z');
insert into public.social_publications(id,curated,title,tags,colors,full_path,thumb_path,width,height,credit,source_url,created_at) values('99999999-9999-4999-8999-000000000004',true,'Jeans para combinar',array['jeans','calca','denim'],array['azul'],'seed/denim/full.jpg','seed/denim/thumb.jpg',2200,1760,'Unsplash · foto 1542272604-787c3835535d','https://images.unsplash.com/photo-1542272604-787c3835535d','2026-10-01T12:56:00Z');
insert into public.social_publications(id,curated,title,tags,colors,full_path,thumb_path,width,height,credit,source_url,created_at) values('99999999-9999-4999-8999-000000000005',true,'Camisa leve',array['camisa','classico','minimalista'],array['branco'],'seed/shirt/full.jpg','seed/shirt/thumb.jpg',2200,1760,'Unsplash · foto 1598033129183-c4f50c736f10','https://images.unsplash.com/photo-1598033129183-c4f50c736f10','2026-10-01T12:55:00Z');
insert into public.social_publications(id,curated,title,tags,colors,full_path,thumb_path,width,height,credit,source_url,created_at) values('99999999-9999-4999-8999-000000000006',true,'O básico branco',array['camiseta','basico','minimalista'],array['branco'],'seed/tee/full.jpg','seed/tee/thumb.jpg',2200,2200,'Unsplash · foto 1521572163474-6864f9cf17ab','https://images.unsplash.com/photo-1521572163474-6864f9cf17ab','2026-10-01T12:54:00Z');
insert into public.social_publications(id,curated,title,tags,colors,full_path,thumb_path,width,height,credit,source_url,created_at) values('99999999-9999-4999-8999-000000000007',true,'Acessório de todos os dias',array['bone','acessorios','urbano'],array['branco'],'seed/cap/full.jpg','seed/cap/thumb.jpg',2200,2927,'Unsplash · foto 1588850561407-ed78c282e89b','https://images.unsplash.com/photo-1588850561407-ed78c282e89b','2026-10-01T12:53:00Z');
insert into public.social_publications(id,curated,title,tags,colors,full_path,thumb_path,width,height,credit,source_url,created_at) values('99999999-9999-4999-8999-000000000008',true,'Paleta do closet',array['paleta','cores','roupas'],array['bege','marrom'],'seed/closet/full.jpg','seed/closet/thumb.jpg',2200,1467,'Unsplash · foto 1445205170230-053b83016050','https://images.unsplash.com/photo-1445205170230-053b83016050','2026-10-01T12:52:00Z');
commit;
