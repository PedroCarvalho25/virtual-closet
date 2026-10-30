import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DA = '11111111-1111-4111-8111-111111111111',
  DB = '22222222-2222-4222-8222-222222222222';
const SA = 'aaaaaaaa-0000-4000-8000-000000000001',
  SB = 'bbbbbbbb-0000-4000-8000-000000000001';
const secret = 'a'.repeat(64);
let db: PGlite;
async function auth(id: string | null, method = 'otp', sid = id === A ? SA : SB, age = 0) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      sub: id,
      session_id: sid,
      amr: [{ method, timestamp: Math.floor(Date.now() / 1000) - age }],
      user_metadata: { amr: [{ method: 'otp', timestamp: Math.floor(Date.now() / 1000) }] },
    }),
  ]);
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
}
async function rpc(name: string, args: string = '', params: unknown[] = []) {
  return (await db.query<{ data: any }>(`select public.${name}(${args}) data`, params)).rows[0]!
    .data;
}
const verify = (id = DA, token = secret) =>
  rpc('identity_session', '$1::uuid,$2,$3', [id, token, 'Meu navegador']);
const draft = (username: string, discoverable = true) => ({
  username,
  firstName: 'Pedro',
  lastName: 'Carvalho',
  bio: 'Estilo sem pressa.',
  tone: 'olive',
  tags: ['Conforto'],
  discoverable,
});
const save = (p: unknown) => rpc('profile_save', '$1::jsonb', [JSON.stringify(p)]);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create schema storage;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
  create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
  alter table storage.objects enable row level security;grant usage on schema public,auth,storage to anon,authenticated;grant all on storage.objects to anon,authenticated;
  insert into auth.users values('${A}','a@example.com',now()),('${B}','b@example.com',now());`);
  for (const name of [
    '202610050001_initial.sql',
    '202610090001_style_studio.sql',
    '202610090002_style_circles.sql',
    '202610130001_identity.sql',
  ])
    await db.exec(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
});
afterAll(async () => db?.close());
describe('identity, email proof and privacy enforced by PostgreSQL', () => {
  it('allows only the availability result anonymously, never account or profile data', async () => {
    await auth(null);
    expect(await rpc('profile_username_available', '$1', ['pedro'])).toBe(true);
    await expect(rpc('identity_account')).rejects.toThrow();
    await expect(rpc('profile_lookup', '$1', ['pedro'])).rejects.toThrow();
    await expect(db.query('select * from public.member_profiles')).rejects.toThrow();
  });
  it('blocks password-only sessions and ignores user-writable metadata claiming OTP', async () => {
    await auth(A, 'password');
    expect((await verify()).verified).toBe(false);
    await expect(rpc('identity_account')).rejects.toThrow('DEVICE_VERIFICATION_REQUIRED');
    await expect(rpc('closet_apply', '\'{"action":"clear_learning"}\'::jsonb')).rejects.toThrow(
      'DEVICE_VERIFICATION_REQUIRED',
    );
    await expect(rpc('create_outfit', "'{}'::uuid[]")).rejects.toThrow(
      'DEVICE_VERIFICATION_REQUIRED',
    );
    await expect(
      rpc('circle_action', '\'{"action":"create","name":"A","title":"Club"}\'::jsonb'),
    ).rejects.toThrow('DEVICE_VERIFICATION_REQUIRED');
    expect((await db.query('select * from public.wardrobe_items')).rows).toEqual([]);
  });
  it('rejects expired or future email proofs', async () => {
    await auth(A, 'otp', SA, 601);
    expect((await verify()).verified).toBe(false);
    await auth(A, 'otp', SA, -120);
    expect((await verify()).verified).toBe(false);
  });
  it('recognizes a device only from fresh signed OTP claims and returns no secret', async () => {
    await auth(A);
    const result = await verify();
    expect(result.verified).toBe(true);
    expect(result.account.devices).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain('secret_hash');
    await expect(db.query('select * from public.identity_devices')).rejects.toThrow();
  });
  it('remembers the same device on a new password session but refuses another secret', async () => {
    await auth(A, 'password', 'aaaaaaaa-0000-4000-8000-000000000002');
    expect((await verify(DA, 'b'.repeat(64))).verified).toBe(false);
    expect((await verify()).verified).toBe(true);
    expect((await verify(DB, secret)).verified).toBe(false);
  });
  it('permits matching real names, enforces unique case-insensitive handles and denies reserved ones', async () => {
    await auth(A);
    await save(draft('pedro.carvalho'));
    await auth(B);
    await verify(DB, 'b'.repeat(64));
    await expect(save(draft('PEDRO.CARVALHO'))).rejects.toThrow('USERNAME_UNAVAILABLE');
    await expect(save(draft('admin'))).rejects.toThrow('USERNAME_UNAVAILABLE');
    const b = await save(draft('pedro.dois'));
    expect(b.profile.firstName).toBe('Pedro');
    expect(b.profile.lastName).toBe('Carvalho');
    await expect(
      db.query("update public.member_profiles set username='bypass' where user_id=$1", [B]),
    ).rejects.toThrow();
  });
  it('limits handle changes on the server while other edits never extend the cooldown', async () => {
    await auth(A);
    const initial = (await rpc('identity_account')).profile.usernameChangedAt;
    await expect(save(draft('novo.pedro'))).rejects.toThrow('USERNAME_COOLDOWN');
    const edit = await save({ ...draft('pedro.carvalho'), bio: 'Outro detalhe.' });
    expect(edit.profile.usernameChangedAt).toBe(initial);
    await db.exec('reset role');
    await db.query(
      "update public.member_profiles set username_changed_at=now()-interval '30 days' where user_id=$1",
      [A],
    );
    await auth(A);
    await save(draft('novo.pedro'));
    await expect(save(draft('mais.um'))).rejects.toThrow('USERNAME_COOLDOWN');
  });
  it('counts follows from rows, keeps follow idempotent and rejects self-follow', async () => {
    await auth(A);
    await rpc('profile_connect', '$1,$2', [B, 'follow']);
    await rpc('profile_connect', '$1,$2', [B, 'follow']);
    expect((await rpc('identity_account')).counts.following).toBe(1);
    await expect(rpc('profile_connect', '$1,$2', [A, 'follow'])).rejects.toThrow(
      'INVALID_CONNECTION',
    );
    await auth(B);
    expect((await rpc('identity_account')).counts.followers).toBe(1);
    await rpc('profile_connect', '$1,$2', [A, 'follow']);
  });
  it('shows only profile data and never email, garments, posts or device information to a follower', async () => {
    await auth(A);
    const card = await rpc('profile_lookup', '$1', ['pedro.dois']);
    expect(card.profile.username).toBe('pedro.dois');
    expect(card.following).toBe(true);
    const text = JSON.stringify(card);
    for (const hidden of ['b@example.com', 'secret', 'devices', 'outfit_id', 'photo_path'])
      expect(text).not.toContain(hidden);
    await expect(db.query('select * from public.member_follows')).rejects.toThrow();
    expect((await db.query('select * from public.posts where user_id=$1', [B])).rows).toEqual([]);
  });
  it('hides an unlisted profile and prevents following it', async () => {
    await auth(B);
    await save(draft('pedro.dois', false));
    await auth(A);
    expect(await rpc('profile_lookup', '$1', ['pedro.dois'])).toBeNull();
    await expect(rpc('profile_connect', '$1,$2', [B, 'follow'])).rejects.toThrow(
      'PROFILE_UNAVAILABLE',
    );
    await auth(B);
    await save(draft('pedro.dois'));
  });
  it('accepts uploaded owned avatars only, and exposes only the selected avatar', async () => {
    await auth(A);
    const path = `${A}/avatars/99999999-9999-4999-8999-999999999999.jpg`;
    await expect(rpc('profile_set_avatar', '$1', [path])).rejects.toThrow('AVATAR_NOT_UPLOADED');
    await db.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)", [
      path,
    ]);
    await rpc('profile_set_avatar', '$1', [path]);
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)", [
        `${B}/avatars/99999999-9999-4999-8999-999999999999.jpg`,
      ]),
    ).rejects.toThrow();
    await auth(B);
    expect(
      (await db.query("select name from storage.objects where bucket_id='profile-photos'")).rows,
    ).toHaveLength(1);
    await expect(rpc('profile_set_avatar', '$1', [path])).rejects.toThrow('INVALID_AVATAR');
  });
  it('blocking removes both follows and stops lookup and avatar reads in both directions', async () => {
    await auth(B);
    await rpc('profile_connect', '$1,$2', [A, 'block']);
    expect((await rpc('identity_account')).counts).toMatchObject({ followers: 0, following: 0 });
    expect(await rpc('profile_lookup', '$1', ['novo.pedro'])).toBeNull();
    expect(
      (await db.query("select name from storage.objects where bucket_id='profile-photos'")).rows,
    ).toEqual([]);
    await auth(A);
    expect(await rpc('profile_lookup', '$1', ['pedro.dois'])).toBeNull();
    await expect(rpc('profile_connect', '$1,$2', [B, 'follow'])).rejects.toThrow(
      'PROFILE_UNAVAILABLE',
    );
    await auth(B);
    expect(await rpc('profile_connections', '$1', ['blocked'])).toHaveLength(1);
    await rpc('profile_connect', '$1,$2', [A, 'unblock']);
    expect((await rpc('identity_account')).counts.followers).toBe(0);
  });
  it('allows follower removal without removing either account', async () => {
    await auth(A);
    await rpc('profile_connect', '$1,$2', [B, 'follow']);
    await auth(B);
    await rpc('profile_connect', '$1,$2', [A, 'remove_follower']);
    expect((await rpc('identity_account')).counts.followers).toBe(0);
    expect(await rpc('profile_lookup', '$1', ['novo.pedro'])).toBeTruthy();
  });
  it('lets owners clean up replaced avatar objects while others see only the selected image', async () => {
    await auth(A);
    const old = `${A}/avatars/99999999-9999-4999-8999-999999999999.jpg`;
    const next = `${A}/avatars/88888888-8888-4888-8888-888888888888.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('profile-photos',$1)", [
      next,
    ]);
    await rpc('profile_set_avatar', '$1', [next]);
    expect(
      (await db.query("select name from storage.objects where bucket_id='profile-photos'")).rows,
    ).toHaveLength(2);
    await auth(B);
    expect(
      (await db.query("select name from storage.objects where bucket_id='profile-photos'")).rows,
    ).toEqual([{ name: next }]);
    await auth(A);
    expect(
      (
        await db.query(
          "delete from storage.objects where bucket_id='profile-photos' and name=$1 returning name",
          [old],
        )
      ).rows,
    ).toEqual([{ name: old }]);
  });
  it('keeps the existing studio and outfit RPCs usable after the device is verified', async () => {
    await auth(A);
    await expect(
      rpc('closet_apply', '$1::jsonb', [JSON.stringify({ action: 'clear_learning' })]),
    ).resolves.toBeTruthy();
    const item = '33333333-3333-4333-8333-333333333333';
    await db.query(
      "insert into public.wardrobe_items(id,user_id,name,category,color,size) values($1,$2,'Camisa','camisa','Branco','M')",
      [item, A],
    );
    await expect(rpc('create_outfit', '$1::uuid[],$2', [[item], 'Meu look'])).resolves.toMatch(
      /^[0-9a-f-]{36}$/,
    );
    await expect(
      rpc('circle_action', '$1::jsonb', [
        JSON.stringify({ action: 'create', name: 'Meu círculo', title: 'Um encontro' }),
      ]),
    ).resolves.toBeTruthy();
  });
  it('revokes device access and cannot reuse the same recent OTP session after revocation', async () => {
    await auth(A);
    await rpc('identity_revoke_device', '$1', [DA]);
    expect((await verify()).verified).toBe(false);
    await expect(rpc('identity_account')).rejects.toThrow('DEVICE_VERIFICATION_REQUIRED');
    expect(
      (await db.query("select * from storage.objects where bucket_id='profile-photos'")).rows,
    ).toEqual([]);
    await auth(A, 'otp', 'aaaaaaaa-0000-4000-8000-000000000003');
    expect((await verify()).verified).toBe(true);
  });
  it('does not expose old privileged functions as a way around the verification gate', async () => {
    await auth(A, 'password', 'aaaaaaaa-0000-4000-8000-000000000004');
    await expect(rpc('create_outfit_before_identity', "'{}'::uuid[]")).rejects.toThrow();
    await expect(rpc('closet_apply_before_identity', "'{}'::jsonb")).rejects.toThrow();
    await expect(rpc('circle_action_before_identity', "'{}'::jsonb")).rejects.toThrow();
    await expect(rpc('identity_counts', '$1', [B])).rejects.toThrow();
  });
});
