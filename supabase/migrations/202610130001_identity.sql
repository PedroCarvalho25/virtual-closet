-- Incremental delivery: identity, recognized devices and private-by-default closet.
-- Apply once AFTER the three existing migrations. No old SQL must be reapplied.
begin;

create table public.identity_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  secret_hash bytea not null,
  label text not null check(length(label) between 1 and 80),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key(user_id,id)
);
create table public.identity_sessions (
  session_id uuid primary key,
  user_id uuid not null,
  device_id uuid not null,
  revoked boolean not null default false,
  foreign key(user_id,device_id) references public.identity_devices(user_id,id) on delete cascade
);
alter table public.identity_devices enable row level security;
alter table public.identity_sessions enable row level security;
revoke all on public.identity_devices,public.identity_sessions from public,anon,authenticated;

create function public.closet_session_allowed() returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.identity_sessions s join public.identity_devices d
      on d.user_id=s.user_id and d.id=s.device_id
    where s.user_id=auth.uid() and s.session_id=nullif(auth.jwt()->>'session_id','')::uuid
      and d.expires_at>now() and not s.revoked
  );
$$;
create function public.require_closet_session() returns void
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.closet_session_allowed() then
    raise exception 'DEVICE_VERIFICATION_REQUIRED' using errcode='42501';
  end if;
end;
$$;
revoke all on function public.closet_session_allowed(),public.require_closet_session() from public,anon;
grant execute on function public.closet_session_allowed(),public.require_closet_session() to authenticated;

create table public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  first_name text not null check(length(btrim(first_name)) between 1 and 50 and first_name !~ '[[:cntrl:]]'),
  last_name text not null check(length(btrim(last_name)) between 1 and 80 and last_name !~ '[[:cntrl:]]'),
  bio text not null default '' check(length(bio)<=160),
  avatar_path text,
  tone text not null default 'olive' check(tone in ('olive','clay','lemon')),
  tags text[] not null default '{}',
  discoverable boolean not null default false,
  username_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check(username=lower(username) and username ~ '^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$' and username !~ '\.\.'),
  check(public.valid_photo_path(avatar_path,user_id,'avatars')),
  check(cardinality(tags)<=3 and tags <@ array['Conforto','Minimal','Cor','Textura','Vintage','Urbano','Clássico','Criativo'])
);
create table public.member_follows (
  follower_id uuid not null references public.member_profiles(user_id) on delete cascade,
  following_id uuid not null references public.member_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id),check(follower_id<>following_id)
);
create index member_follows_target on public.member_follows(following_id,created_at desc,follower_id);
create table public.member_blocks (
  blocker_id uuid not null references public.member_profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.member_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
alter table public.member_profiles enable row level security;
alter table public.member_follows enable row level security;
alter table public.member_blocks enable row level security;
revoke all on public.member_profiles,public.member_follows,public.member_blocks from public,anon,authenticated;

create function public.profile_is_visible(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.closet_session_allowed() and exists(select 1 from public.member_profiles p
 where p.user_id=target and (p.user_id=auth.uid() or (p.discoverable and not exists(
   select 1 from public.member_blocks b where (b.blocker_id=auth.uid() and b.blocked_id=target)
   or (b.blocked_id=auth.uid() and b.blocker_id=target)))));
$$;
revoke all on function public.profile_is_visible(uuid) from public,anon;
grant execute on function public.profile_is_visible(uuid) to authenticated;

-- Internal builders never expose account emails, device secrets or private garments.
create function public.identity_profile_json(p public.member_profiles) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.user_id,'username',p.username,'firstName',p.first_name,'lastName',p.last_name,
 'bio',p.bio,'avatarPath',p.avatar_path,'tone',p.tone,'tags',p.tags,'discoverable',p.discoverable,
 'usernameChangedAt',p.username_changed_at,'usernameAvailableAt',p.username_changed_at+interval '30 days','createdAt',p.created_at);
$$;
create function public.identity_counts(target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('following',(select count(*) from public.member_follows where follower_id=target),
 'followers',(select count(*) from public.member_follows where following_id=target),
 'posts',(select count(*) from public.posts where user_id=target));
$$;
revoke all on function public.identity_profile_json(public.member_profiles),public.identity_counts(uuid) from public,anon,authenticated;

create function public.identity_account() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid(); current_device uuid;
begin
 perform public.require_closet_session();
 select device_id into current_device from public.identity_sessions where session_id=(auth.jwt()->>'session_id')::uuid and user_id=caller;
 return jsonb_build_object('profile',(select public.identity_profile_json(p) from public.member_profiles p where user_id=caller),
 'counts',public.identity_counts(caller),'devices',coalesce((select jsonb_agg(jsonb_build_object(
 'id',id,'label',label,'createdAt',created_at,'lastSeenAt',last_seen_at,'expiresAt',expires_at,'current',id=current_device)
 order by last_seen_at desc,id) from public.identity_devices where user_id=caller and expires_at>now()),'[]'::jsonb));
end;
$$;

create function public.identity_session(p_device_id uuid,p_secret text,p_label text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
 accepted boolean:=false; otp boolean:=false; bound_device uuid; was_revoked boolean;
begin
 if caller is null or sid is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if p_device_id is null or p_secret is null or p_secret !~ '^[0-9a-f]{64}$' or coalesce(length(btrim(p_label)),0) not between 1 and 80 then
   raise exception 'INVALID_DEVICE' using errcode='22023';end if;
 -- The authentication service signs these claims. User metadata is not evidence.
 otp:=exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) m
   where m->>'method'='otp' and (m->>'timestamp')::double precision between extract(epoch from now())-600 and extract(epoch from now())+60)
   and exists(select 1 from auth.users where id=caller and email_confirmed_at is not null and email is not null);
 perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
 select device_id,revoked into bound_device,was_revoked from public.identity_sessions where session_id=sid and user_id=caller;
 if was_revoked then return jsonb_build_object('verified',false,'account',null);end if;
 if bound_device is not null and bound_device<>p_device_id then return jsonb_build_object('verified',false,'account',null);end if;
 accepted:=exists(select 1 from public.identity_devices where user_id=caller and id=p_device_id
   and secret_hash=sha256(convert_to(p_secret,'UTF8')) and expires_at>now());
 if not accepted and not otp then return jsonb_build_object('verified',false,'account',null);end if;
 if not accepted then
   delete from public.identity_devices where user_id=caller and expires_at<now()-interval '1 day';
   if (select count(*) from public.identity_devices where user_id=caller and expires_at>now())>=20 then
     raise exception 'DEVICE_LIMIT' using errcode='22023';end if;
   insert into public.identity_devices(user_id,id,secret_hash,label,expires_at)
   values(caller,p_device_id,sha256(convert_to(p_secret,'UTF8')),btrim(p_label),now()+interval '90 days')
   on conflict(user_id,id) do update set secret_hash=excluded.secret_hash,label=excluded.label,expires_at=excluded.expires_at;
 end if;
 update public.identity_devices set last_seen_at=now() where user_id=caller and id=p_device_id;
 insert into public.identity_sessions(session_id,user_id,device_id) values(sid,caller,p_device_id) on conflict(session_id) do nothing;
 return jsonb_build_object('verified',true,'account',public.identity_account());
end;
$$;

create function public.identity_revoke_device(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.require_closet_session();
 update public.identity_sessions set revoked=true where user_id=auth.uid() and device_id=p_id;
 update public.identity_devices set expires_at=now() where user_id=auth.uid() and id=p_id;
end;
$$;

create function public.profile_username_available(p_username text) returns boolean
language sql stable security definer set search_path='' as $$
 select p_username=lower(btrim(p_username)) and p_username ~ '^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$'
 and p_username !~ '\.\.' and p_username <> all(array['admin','administrador','suporte','support','virtualcloset','virtual_closet','login','signup','api','account','settings','moderador'])
 and not exists(select 1 from public.member_profiles where username=p_username and user_id is distinct from auth.uid());
$$;

create function public.profile_save(p_profile jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();previous public.member_profiles; handle text:=lower(btrim(p_profile->>'username')); values_tags text[];
begin
 perform public.require_closet_session();
 if p_profile is null or octet_length(p_profile::text)>4000 or jsonb_typeof(p_profile->'tags') is distinct from 'array'
   or jsonb_typeof(p_profile->'discoverable') is distinct from 'boolean' then raise exception 'INVALID_PROFILE' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
 select * into previous from public.member_profiles where user_id=caller for update;
 if previous.user_id is not null and handle is distinct from previous.username and now()<previous.username_changed_at+interval '30 days' then
   raise exception 'USERNAME_COOLDOWN' using errcode='22023';end if;
 if not public.profile_username_available(handle) then raise exception 'USERNAME_UNAVAILABLE' using errcode='23505';end if;
 select coalesce(array_agg(distinct value),'{}') into values_tags from jsonb_array_elements_text(p_profile->'tags');
 insert into public.member_profiles(user_id,username,first_name,last_name,bio,tone,tags,discoverable)
 values(caller,handle,btrim(p_profile->>'firstName'),btrim(p_profile->>'lastName'),btrim(coalesce(p_profile->>'bio','')),p_profile->>'tone',values_tags,(p_profile->>'discoverable')::boolean)
 on conflict(user_id) do update set username=excluded.username,first_name=excluded.first_name,last_name=excluded.last_name,
 bio=excluded.bio,tone=excluded.tone,tags=excluded.tags,discoverable=excluded.discoverable,
 username_changed_at=case when member_profiles.username<>excluded.username then now() else member_profiles.username_changed_at end;
 -- Name shown in old style screens remains compatible without replacing preferences.
 insert into public.closet_profiles(user_id) values(caller) on conflict do nothing;
 update public.closet_profiles set profile=jsonb_set(profile,'{name}',to_jsonb(btrim(p_profile->>'firstName'))) where user_id=caller;
 return public.identity_account();
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',false,1048576,array['image/jpeg']);
create policy profile_photo_upload on storage.objects for insert to authenticated with check(
 bucket_id='profile-photos' and public.closet_session_allowed() and public.valid_photo_path(name,auth.uid(),'avatars') and name is not null);
create policy profile_photo_remove on storage.objects for delete to authenticated using(
 bucket_id='profile-photos' and public.closet_session_allowed() and (storage.foldername(name))[1]=auth.uid()::text);
-- Used by the storage policy without granting access to profile columns.
create function public.profile_avatar_readable(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.member_profiles where avatar_path=p_path and public.profile_is_visible(user_id));
$$;
create policy profile_photo_read on storage.objects for select to authenticated using(bucket_id='profile-photos' and (
 public.profile_avatar_readable(name) or (public.closet_session_allowed() and name is not null and public.valid_photo_path(name,auth.uid(),'avatars'))));
revoke all on function public.profile_avatar_readable(text) from public,anon;
grant execute on function public.profile_avatar_readable(text) to authenticated;

create function public.profile_set_avatar(p_path text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform public.require_closet_session();
 if not public.valid_photo_path(p_path,auth.uid(),'avatars') then raise exception 'INVALID_AVATAR' using errcode='22023';end if;
 if p_path is not null and not exists(select 1 from storage.objects where bucket_id='profile-photos' and name=p_path) then
   raise exception 'AVATAR_NOT_UPLOADED' using errcode='22023';end if;
 update public.member_profiles set avatar_path=p_path where user_id=auth.uid();
 if not found then raise exception 'PROFILE_REQUIRED' using errcode='22023';end if;
 return public.identity_account();
end;
$$;

create function public.profile_lookup(p_username text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.member_profiles;
begin
 perform public.require_closet_session();
 select * into p from public.member_profiles where username=lower(btrim(p_username));
 if p.user_id is null or not public.profile_is_visible(p.user_id) then return null;end if;
 return jsonb_build_object('profile',public.identity_profile_json(p),'counts',public.identity_counts(p.user_id),
 'following',exists(select 1 from public.member_follows where follower_id=auth.uid() and following_id=p.user_id),'self',p.user_id=auth.uid());
end;
$$;

create function public.profile_connect(p_target uuid,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();
begin
 perform public.require_closet_session();
 if p_target is null or p_target=caller or not exists(select 1 from public.member_profiles where user_id=caller) then
   raise exception 'INVALID_CONNECTION' using errcode='22023';end if;
 -- Stable lock ordering makes follow/block races resolve consistently.
 perform user_id from public.member_profiles where user_id in (caller,p_target) order by user_id for update;
 if p_action='follow' then
   if not public.profile_is_visible(p_target) then raise exception 'PROFILE_UNAVAILABLE' using errcode='42501';end if;
   if (select count(*) from public.member_follows where follower_id=caller)>=2000 then raise exception 'FOLLOW_LIMIT' using errcode='22023';end if;
   insert into public.member_follows(follower_id,following_id) values(caller,p_target) on conflict do nothing;
 elsif p_action='unfollow' then delete from public.member_follows where follower_id=caller and following_id=p_target;
 elsif p_action='remove_follower' then delete from public.member_follows where follower_id=p_target and following_id=caller;
 elsif p_action='block' then
   insert into public.member_blocks(blocker_id,blocked_id) values(caller,p_target) on conflict do nothing;
   delete from public.member_follows where (follower_id=caller and following_id=p_target) or (following_id=caller and follower_id=p_target);
 elsif p_action='unblock' then delete from public.member_blocks where blocker_id=caller and blocked_id=p_target;
 else raise exception 'INVALID_CONNECTION' using errcode='22023';end if;
 return public.identity_account();
end;
$$;

create function public.profile_connections(p_kind text,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.require_closet_session();
 if p_kind not in ('followers','following','blocked') or p_offset not between 0 and 10000 then raise exception 'INVALID_PAGE' using errcode='22023';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.user_id,'username',p.username,'firstName',p.first_name,'lastName',p.last_name,'avatarPath',case when p_kind='blocked' then null else p.avatar_path end,'tone',p.tone))
 from (select p.* from public.member_profiles p where
 (p_kind='blocked' and exists(select 1 from public.member_blocks b where b.blocker_id=auth.uid() and b.blocked_id=p.user_id)) or
 (p_kind<>'blocked' and public.profile_is_visible(p.user_id) and exists(select 1 from public.member_follows f where
 (p_kind='followers' and f.following_id=auth.uid() and f.follower_id=p.user_id) or
 (p_kind='following' and f.follower_id=auth.uid() and f.following_id=p.user_id)))
 order by p.username,p.user_id limit 30 offset p_offset)p),'[]'::jsonb);
end;
$$;

revoke all on function public.identity_account(),public.identity_session(uuid,text,text),public.identity_revoke_device(uuid),
 public.profile_username_available(text),public.profile_save(jsonb),public.profile_set_avatar(text),public.profile_lookup(text),
 public.profile_connect(uuid,text),public.profile_connections(text,integer) from public,anon,authenticated;
grant execute on function public.profile_username_available(text) to anon,authenticated;
grant execute on function public.identity_account(),public.identity_session(uuid,text,text),public.identity_revoke_device(uuid),
 public.profile_save(jsonb),public.profile_set_avatar(text),public.profile_lookup(text),public.profile_connect(uuid,text),public.profile_connections(text,integer) to authenticated;

-- Apply the recognition requirement to existing direct table access.
do $$declare t text;begin
 foreach t in array array['wardrobe_items','outfits','outfit_items','wear_log','posts','closet_profiles','closet_item_meta','closet_outfit_meta','closet_documents','style_circles','style_members','style_invites','style_messages','style_votes'] loop
   execute format('create policy recognized_device on public.%I as restrictive for all to authenticated using ((select public.closet_session_allowed())) with check ((select public.closet_session_allowed()))',t);
 end loop;
end;$$;
create policy recognized_closet_photo_device on storage.objects as restrictive for all to authenticated
 using(bucket_id not in ('closet-photos','profile-photos') or public.closet_session_allowed())
 with check(bucket_id not in ('closet-photos','profile-photos') or public.closet_session_allowed());

-- SECURITY DEFINER entry points must enforce the gate as well as table policies.
alter function public.create_outfit(uuid[],text,text) rename to create_outfit_before_identity;
alter function public.closet_apply(jsonb) rename to closet_apply_before_identity;
alter function public.circle_action(jsonb) rename to circle_action_before_identity;
revoke all on function public.create_outfit_before_identity(uuid[],text,text),public.closet_apply_before_identity(jsonb),public.circle_action_before_identity(jsonb) from public,anon,authenticated;
create function public.create_outfit(p_item_ids uuid[],p_name text default null,p_photo_path text default null) returns uuid
language plpgsql security definer set search_path='' as $$begin perform public.require_closet_session();return public.create_outfit_before_identity(p_item_ids,p_name,p_photo_path);end;$$;
create function public.closet_apply(p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$begin perform public.require_closet_session();return public.closet_apply_before_identity(p_action);end;$$;
create function public.circle_action(p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$begin perform public.require_closet_session();return public.circle_action_before_identity(p_action);end;$$;
revoke all on function public.create_outfit(uuid[],text,text),public.closet_apply(jsonb),public.circle_action(jsonb) from public,anon;
grant execute on function public.create_outfit(uuid[],text,text),public.closet_apply(jsonb),public.circle_action(jsonb) to authenticated;

-- A member-helper RPC must not reveal membership on an unrecognized session.
create or replace function public.style_is_member(p_circle uuid) returns boolean
language sql stable security definer set search_path='' as $$select public.closet_session_allowed() and exists(select 1 from public.style_members where circle_id=p_circle and user_id=auth.uid())$$;
commit;
