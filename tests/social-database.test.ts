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
    '202610140001_mural.sql',
  ])
    await db.exec(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
});

const query = (q: object = {}) => rpc('social_query', '$1::jsonb', [JSON.stringify(q)]);
const act = (q: object) => rpc('social_action', '$1::jsonb', [JSON.stringify(q)]);
const upload = async (owner: string, key: number) => {
  const fullPath = `${owner}/11111111-1111-4111-8111-${String(key).padStart(12, '0')}/full.jpg`;
  const thumbPath = fullPath.replace('/full.jpg', '/thumb.jpg');
  for (const path of [fullPath, thumbPath])
    await db.query("insert into storage.objects(bucket_id,name) values('mural-photos',$1)", [path]);
  return { fullPath, thumbPath, width: 1600, height: 2200 };
};
let post: any;
afterAll(async () => db?.close());
describe('explicit mural publications and privacy', () => {
  it('denies anonymous and unverified sessions, direct tables and private helpers', async () => {
    await auth(null);
    await expect(query()).rejects.toThrow();
    await auth(A, 'password');
    await expect(query()).rejects.toThrow('DEVICE_VERIFICATION_REQUIRED');
    await auth(A);
    await verify();
    await save(draft('pedro.um'));
    await auth(B);
    await verify(DB);
    await save(draft('pedro.dois'));
    await expect(db.query('select * from public.social_publications')).rejects.toThrow();
    await expect(rpc('social_author', '$1', [A])).rejects.toThrow();
    await expect(rpc('identity_counts', '$1', [A])).rejects.toThrow();
  });
  it('requires explicit publication, ownership and both uploaded media variants', async () => {
    await auth(A);
    expect((await query()).items.filter((p: any) => !p.curated)).toHaveLength(0);
    await expect(
      act({
        action: 'publish',
        title: 'Outra foto',
        fullPath: `${B}/abc/full.jpg`,
        thumbPath: `${B}/abc/thumb.jpg`,
        width: 1,
        height: 1,
      }),
    ).rejects.toThrow('INVALID_MEDIA');
    await expect(
      act({
        action: 'publish',
        title: 'Sem upload',
        fullPath: `${A}/abc/full.jpg`,
        thumbPath: `${A}/abc/thumb.jpg`,
        width: 1,
        height: 1,
      }),
    ).rejects.toThrow('MEDIA_NOT_UPLOADED');
    const media = await upload(A, 1);
    post = await act({
      action: 'publish',
      title: 'Tricô azul',
      caption: 'Texturas para o inverno',
      tags: ['conforto'],
      colors: ['azul'],
      ...media,
    });
    expect(post).toMatchObject({ mine: true, curated: false, liked: false });
    expect((await act({ action: 'publish', title: 'Tricô azul', ...media })).id).toBe(post.id);
    expect((await rpc('identity_account')).counts.posts).toBe(1);
    expect(
      (await db.query("delete from storage.objects where bucket_id='mural-photos' returning name"))
        .rows,
    ).toHaveLength(0);
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values('mural-photos',$1)", [
        `${B}/abc/full.jpg`,
      ]),
    ).rejects.toThrow();
  });
  it('searches accents, tags and colors without leaking saved posts between accounts', async () => {
    await auth(B);
    expect((await query({ search: 'trico', color: 'azul' })).items.map((p: any) => p.id)).toContain(
      post.id,
    );
    expect((await query({ search: 'conforto' })).items.map((p: any) => p.id)).toContain(post.id);
    expect((await query({ search: 'conforto', color: 'rosa' })).items).toHaveLength(0);
    await act({ action: 'save', id: post.id, active: true });
    await act({ action: 'like', id: post.id, active: true });
    await act({ action: 'like', id: post.id, active: true });
    expect(await query({ kind: 'detail', id: post.id })).toMatchObject({
      liked: true,
      likes: 1,
      saved: true,
    });
    await auth(A);
    expect((await query({ mode: 'saved' })).items).toHaveLength(0);
    expect(await query({ kind: 'detail', id: post.id })).toMatchObject({
      liked: false,
      likes: 1,
      saved: false,
    });
    await expect(act({ action: 'like', id: post.id, active: 'yes' })).rejects.toThrow(
      'INVALID_ACTION',
    );
  });
  it('requires mutual friendship for sending and attributes reposts to the original author', async () => {
    await auth(B);
    await rpc('profile_connect', '$1,$2', [A, 'follow']);
    await expect(act({ action: 'share', id: post.id, recipient: A })).rejects.toThrow(
      'FRIEND_REQUIRED',
    );
    await act({ action: 'repost', id: post.id, active: true });
    await auth(A);
    await rpc('profile_connect', '$1,$2', [B, 'follow']);
    const p = await query({ kind: 'detail', id: post.id });
    expect(p.author.id).toBe(A);
    expect(p.reposters[0].id).toBe(B);
    await auth(B);
    expect(await query({ kind: 'detail', id: post.id })).toMatchObject({ friend: true });
    await act({ action: 'share', id: post.id, recipient: A });
    await act({ action: 'share', id: post.id, recipient: A });
    await auth(A);
    const inbox = await query({ kind: 'inbox' });
    expect(inbox).toHaveLength(1);
    await act({ action: 'read', id: inbox[0].id });
    expect((await query({ kind: 'inbox' }))[0].read).toBe(true);
  });
  it('blocks both directions including photo access, inbox, and existing reposts', async () => {
    await auth(B);
    await rpc('profile_connect', '$1,$2', [A, 'block']);
    expect(await query({ kind: 'detail', id: post.id })).toBeNull();
    expect((await query({ mode: 'saved' })).items).toHaveLength(0);
    expect(
      (await db.query("select name from storage.objects where bucket_id='mural-photos'")).rows,
    ).toHaveLength(0);
    await expect(act({ action: 'share', id: post.id, recipient: A })).rejects.toThrow(
      'PUBLICATION_UNAVAILABLE',
    );
    await auth(A);
    expect(await query({ kind: 'inbox' })).toHaveLength(0);
    expect((await query({ kind: 'detail', id: post.id })).reposters).toHaveLength(0);
    await auth(B);
    await rpc('profile_connect', '$1,$2', [A, 'unblock']);
    await auth(A);
    expect(await query({ kind: 'inbox' })).toHaveLength(0);
  });
  it('hides and reports privately, respects private profiles and owner-only deletion', async () => {
    await auth(B);
    await expect(act({ action: 'delete', id: post.id })).rejects.toThrow('NOT_OWNER');
    await act({ action: 'report', id: post.id, reason: 'rights' });
    expect((await query()).items.map((p: any) => p.id)).not.toContain(post.id);
    await expect(db.query('select * from public.social_reports')).rejects.toThrow();
    await auth(A);
    expect((await query({ mode: 'mine' })).items).toHaveLength(1);
    await save(draft('pedro.um', false));
    await expect(act({ action: 'publish', title: 'X' })).rejects.toThrow('PUBLIC_PROFILE_REQUIRED');
    await auth(B);
    expect(await query({ kind: 'detail', id: post.id })).toBeNull();
    await auth(A);
    await act({ action: 'delete', id: post.id });
    expect(
      (await db.query("delete from storage.objects where bucket_id='mural-photos' returning name"))
        .rows,
    ).toHaveLength(2);
    expect((await rpc('identity_account')).counts.posts).toBe(0);
    await save(draft('pedro.um'));
  });
  it('paginates tied timestamps once and enforces daily publication limits', async () => {
    await auth(A);
    for (let i = 2; i <= 31; i++)
      await act({
        action: 'publish',
        title: `Look ${i}`,
        colors: ['preto'],
        ...(await upload(A, i)),
      });
    const ids: string[] = [];
    let cursor = null;
    do {
      const page = await query({ mode: 'mine', cursor });
      ids.push(...page.items.map((p: any) => p.id));
      cursor = page.next;
    } while (cursor);
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    await expect(
      act({ action: 'publish', title: 'Limite', ...(await upload(A, 32)) }),
    ).rejects.toThrow('PUBLISH_LIMIT');
    const prior = (await query({ mode: 'mine' })).items[0];
    expect(
      (
        await act({
          action: 'publish',
          title: prior.title,
          fullPath: prior.fullPath,
          thumbPath: prior.thumbPath,
          width: prior.width,
          height: prior.height,
        })
      ).id,
    ).toBe(prior.id);
    await auth(B);
    expect((await query({ mode: 'mine' })).items).toHaveLength(0);
    expect((await query({ mode: 'saved' })).items).toHaveLength(0);
  });
  it('preserves private photo, outfit, wear and diary persistence under all five migrations', async () => {
    await auth(A);
    const item = '44444444-4444-4444-8444-444444444444';
    const photo = `${A}/items/${item}.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('closet-photos',$1)", [
      photo,
    ]);
    await db.query(
      "insert into public.wardrobe_items(id,user_id,name,category,color,size,photo_path) values($1,$2,'Camisa privada','camisa','Branco','M',$3)",
      [item, A, photo],
    );
    const outfit = await rpc('create_outfit', '$1::uuid[],$2', [[item], 'Look privado']);
    await db.query(
      "insert into public.wear_log(user_id,outfit_id,worn_date) values($1,$2,'2026-10-01')",
      [A, outfit],
    );
    await db.query(
      "insert into public.posts(user_id,outfit_id,caption) values($1,$2,'Diário privado')",
      [A, outfit],
    );
    expect((await rpc('identity_account')).counts.posts).toBe(30);
    await auth(B);
    for (const table of ['wardrobe_items', 'outfits', 'wear_log', 'posts'])
      expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
    expect(
      (await db.query("select name from storage.objects where bucket_id='closet-photos'")).rows,
    ).toHaveLength(0);
    expect((await query({ search: 'privado' })).items).toHaveLength(0);
    await auth(A);
    expect(
      (await db.query('select photo_path from public.wardrobe_items where id=$1', [item])).rows,
    ).toEqual([{ photo_path: photo }]);
    expect(
      (await db.query('select * from public.wear_log where outfit_id=$1', [outfit])).rows,
    ).toHaveLength(1);
    expect(
      (await db.query('select * from public.posts where outfit_id=$1', [outfit])).rows,
    ).toHaveLength(1);
  });
});

describe('sixth migration: banners, private notebook and verified catalog', () => {
  const curated = '99999999-9999-4999-8999-000000000101';
  const banner = `${A}/banners/77777777-7777-4777-8777-777777777777.jpg`;
  beforeAll(async () => {
    await db.exec('reset role');
    await db.exec(
      readFileSync(
        new URL('../supabase/migrations/202610150001_personalization.sql', import.meta.url),
        'utf8',
      ),
    );
  });
  it('exposes 48 distinct approved photographs and keeps previous records without replacing identities', async () => {
    await auth(A);
    const found = new Set<string>();
    let cursor = null;
    do {
      const page = await query({ cursor });
      for (const p of page.items) if (p.curated) found.add(p.id);
      cursor = page.next;
    } while (cursor);
    expect(found.size).toBe(48);
    expect(await query({ kind: 'detail', id: '99999999-9999-4999-8999-000000000001' })).toBeNull();
    expect((await query({ kind: 'detail', id: curated })).credit).toContain('CC0');
  });
  it('keeps notes private to the caller and out of public publication data', async () => {
    const note = (action: object) => rpc('social_notebook', '$1::jsonb', [JSON.stringify(action)]);
    await auth(A);
    expect(await note({ kind: 'save', id: curated, note: 'Minha ideia privada' })).toBe(
      'Minha ideia privada',
    );
    expect(JSON.stringify(await query({ kind: 'detail', id: curated }))).not.toContain(
      'Minha ideia privada',
    );
    await expect(db.query('select * from public.social_notebook_entries')).rejects.toThrow();
    await auth(B);
    expect(await note({ kind: 'get', id: curated })).toBe('');
    await auth(null);
    await expect(note({ kind: 'get', id: curated })).rejects.toThrow();
    await auth(A);
    await expect(note({ kind: 'save', id: curated, note: 'x'.repeat(1201) })).rejects.toThrow(
      'INVALID_NOTE',
    );
    expect(await note({ kind: 'save', id: curated, note: '' })).toBe('');
  });
  it('protects uploaded banners by ownership, profile visibility, blocks and session', async () => {
    await auth(A);
    await db.query("insert into storage.objects(bucket_id,name) values('profile-banners',$1)", [
      banner,
    ]);
    const account = await rpc('profile_set_banner', '$1', [banner]);
    expect(account.profile.bannerPath).toBe(banner);
    await auth(B);
    await expect(rpc('profile_set_banner', '$1', [banner])).rejects.toThrow('INVALID_BANNER');
    expect(await rpc('profile_banner_readable', '$1', [banner])).toBe(true);
    await auth(A);
    await save(draft('pedro.um', false));
    await auth(B);
    expect(await rpc('profile_banner_readable', '$1', [banner])).toBe(false);
    expect(
      (await db.query("select name from storage.objects where bucket_id='profile-banners'")).rows,
    ).toHaveLength(0);
    await auth(null);
    await expect(rpc('profile_set_banner', '$1', [banner])).rejects.toThrow();
    await auth(A);
    await save(draft('pedro.um'));
    await rpc('profile_connect', '$1::uuid,$2', [B, 'block']);
    await auth(B);
    expect(await rpc('profile_banner_readable', '$1', [banner])).toBe(false);
    await auth(A);
    expect((await rpc('profile_set_banner', '$1', [null])).profile.bannerPath).toBeNull();
  });
});
