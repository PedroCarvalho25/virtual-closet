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
    '202610150001_personalization.sql',
    '202610150002_atelier.sql',
    '202610150003_capture_planning.sql',
    '202610150004_account_control.sql',
    '202610160001_visual_wishes.sql',
  ])
    await db.exec(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
});

const action = (value: object) => rpc('atelier_action', '$1::jsonb', [JSON.stringify(value)]);
afterAll(async () => db?.close());
describe('visual wishes remain private and separate from owned clothes', () => {
  const wishId = '11111111-1234-4123-8123-123456789010';
  const designId = '11111111-1234-4123-8123-123456789011';
  const item = '11111111-1234-4123-8123-123456789012';
  const wish = {
    id: wishId,
    title: 'Camisa de linho',
    category: 'camisa',
    color: 'Areia',
    price: null,
    source: '',
    note: '',
    reflectUntil: null,
    revision: 0,
    styling: { volume: 'roomy', texture: 'linen', occasion: 'casual' },
  };
  const put = (w: object) =>
    rpc('closet_apply', '$1::jsonb', [JSON.stringify({ action: 'wish', wish: w })]);
  let publication: string, saved: any;
  it('requires the recognized session and denies helper RPCs', async () => {
    await auth(null);
    await expect(rpc('visual_style_ready')).rejects.toThrow();
    await auth(A, 'password');
    await expect(rpc('visual_style_ready')).rejects.toThrow();
    await auth(A);
    await verify();
    await save(draft('armando.teste'));
    expect(await rpc('visual_style_ready')).toBe(true);
    for (const name of [
      'closet_apply_before_visuals',
      'closet_apply_before_identity',
      'visual_check_traits',
    ])
      await expect(rpc(name, '$1::jsonb', ['{}'])).rejects.toThrow();
    publication = (await rpc('social_query', '$1::jsonb', ['{}'])).items[0].id;
    await auth(B);
    await verify(DB);
    await save(draft('outra.pessoa'));
    await auth(A);
  });
  it('persists a reference and confirmed traits, rejecting stale edits', async () => {
    const snapshot = await put({ ...wish, media: { publicationId: publication } });
    expect(snapshot.evolution.wishes[0]).toMatchObject({
      id: wishId,
      revision: 1,
      styling: wish.styling,
      media: { publicationId: publication },
    });
    await expect(put(wish)).rejects.toThrow('CONFLICT');
    await expect(put({ ...wish, revision: undefined })).rejects.toThrow('CONFLICT');
    await expect(
      put({ ...wish, revision: 1, styling: { ...wish.styling, volume: 'invented' } }),
    ).rejects.toThrow('INVALID_STYLE_TRAITS');
    await expect(
      put({
        ...wish,
        revision: 1,
        media: { publicationId: '11111111-0000-4000-8000-000000000000' },
      }),
    ).rejects.toThrow('REFERENCE_UNAVAILABLE');
  });
  it('rejects media belonging to another account and missing uploads', async () => {
    await db.exec('reset role');
    await db.query(
      "insert into storage.objects(bucket_id,name) values('closet-photos',$1),('closet-photos',$2)",
      [`${A}/outfits/wish.jpg`, `${B}/outfits/private.jpg`],
    );
    await auth(A);
    await expect(
      put({ ...wish, revision: 1, media: { photoPath: `${B}/outfits/private.jpg` } }),
    ).rejects.toThrow('PHOTO_UNAVAILABLE');
    await expect(
      put({ ...wish, revision: 1, media: { photoPath: `${A}/outfits/missing.jpg` } }),
    ).rejects.toThrow('PHOTO_UNAVAILABLE');
    const snapshot = await put({
      ...wish,
      revision: 1,
      media: { photoPath: `${A}/outfits/wish.jpg` },
    });
    expect(snapshot.evolution.wishes[0].revision).toBe(2);
    await auth(B);
    expect((await rpc('closet_snapshot')).evolution.wishes).toHaveLength(0);
    await expect(put(wish)).rejects.toThrow();
    await auth(A);
  });
  it('allows only owned wishes in compositions and excludes them from saved looks', async () => {
    await db.query(
      "insert into public.wardrobe_items(id,user_id,name,category,color,size,fit) values($1,$2,'Calça','calca','Preto','M','normal')",
      [item, A],
    );
    const layer = (kind: string, target: string, id: string) => ({
      id,
      kind,
      target,
      x: 20,
      y: 20,
      width: 100,
      height: 160,
      rotation: 0,
    });
    const design = {
      title: 'Uma ideia',
      note: '',
      revision: 0,
      sourceId: null,
      parentId: null,
      layers: [layer('wish', wishId, 'wish'), layer('item', item, 'item')],
    };
    await auth(B);
    await expect(
      action({
        action: 'save_design',
        id: designId,
        design: { ...design, layers: [layer('wish', wishId, 'wish')] },
      }),
    ).rejects.toThrow('WISH_UNAVAILABLE');
    await auth(A);
    saved = await action({ action: 'save_design', id: designId, design });
    expect(saved.layers[0].kind).toBe('wish');
    saved = await action({ action: 'save_outfit', id: designId, revision: saved.revision });
    expect(
      (
        await db.query('select item_id from public.outfit_items where outfit_id=$1', [
          saved.outfitId,
        ])
      ).rows,
    ).toEqual([{ item_id: item }]);
    expect((await rpc('closet_snapshot')).evolution.wishes).toHaveLength(1);
    await expect(action({ action: 'save_design', id: designId, design: saved })).rejects.toThrow(
      'CONFLICT',
    );
  });
  it('validates item traits through the same protected write chain', async () => {
    const detail = {
      state: 'available',
      location: '',
      story: '',
      care: '',
      loanTo: '',
      returnDate: null,
      weightGrams: null,
      styling: wish.styling,
    };
    const result = await rpc('closet_apply', '$1::jsonb', [
      JSON.stringify({ action: 'item_detail', id: item, detail }),
    ]);
    expect(result.evolution.details[item].styling).toEqual(wish.styling);
    await expect(
      rpc('closet_apply', '$1::jsonb', [
        JSON.stringify({ action: 'item_detail', id: item, detail: { ...detail, styling: [] } }),
      ]),
    ).rejects.toThrow('INVALID_STYLE_TRAITS');
  });
});
