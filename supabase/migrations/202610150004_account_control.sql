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
