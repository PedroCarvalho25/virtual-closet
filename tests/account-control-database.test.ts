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

afterAll(async () => db?.close());
describe('account portability, erasure and expanded planning schema', () => {
  const item = '11111111-1234-4123-8123-123456789000';
  const photo = `${A}/items/${item}.jpg`;
  const otherPhoto = `${B}/items/${item}.jpg`;
  it('exports only the current account and no authentication secrets', async () => {
    await auth(A);
    await verify();
    await save(draft('pedro.um'));
    await auth(B);
    await verify(DB);
    await save(draft('pedro.dois'));
    await db.query(
      "insert into public.wardrobe_items(id,user_id,name,category,color,size) values($1,$2,'Vestido privado B','vestido','Verde','M')",
      [item, B],
    );
    await db.query("insert into storage.objects(bucket_id,name) values('closet-photos',$1)", [
      otherPhoto,
    ]);
    await auth(A);
    await db.query("insert into storage.objects(bucket_id,name) values('closet-photos',$1)", [
      photo,
    ]);
    const data = await rpc('account_export');
    expect(data.accountId).toBe(A);
    expect(data.studio.items).toHaveLength(0);
    expect(data.media).toEqual([{ bucket: 'closet-photos', path: photo }]);
    expect(JSON.stringify(data)).not.toContain('secret_hash');
    expect(JSON.stringify(data)).not.toContain('Vestido privado B');
    await expect(db.query('select * from public.account_erasure_intents')).rejects.toThrow();
    await auth(null);
    await expect(rpc('account_export')).rejects.toThrow();
  });
  it('accepts new garment types and validates dated activities', async () => {
    await auth(B);
    const recipe = {
      id: '11111111-1234-4123-8123-123456789001',
      title: 'Peça única',
      folder: 'Viagem',
      note: '',
      source: '',
      slots: [{ role: 'onepiece', category: 'vestido', color: 'Verde' }],
    };
    await rpc('closet_apply', '$1::jsonb', [JSON.stringify({ action: 'recipe', recipe })]);
    const plan = {
      id: '11111111-1234-4123-8123-123456789002',
      title: 'Viagem',
      date: '2026-12-01',
      end_date: '2026-12-04',
      kind: 'trip',
      item_ids: [item],
      outfit_ids: [],
      notes: '',
      reminder: false,
    };
    await rpc('closet_apply', '$1::jsonb', [JSON.stringify({ action: 'plan', plan })]);
    const detail = {
      packed: [],
      backupOutfitIds: [],
      days: {},
      tasks: [],
      activities: { '2026-12-02': 'Passeio e jantar' },
    };
    const result = await rpc('closet_apply', '$1::jsonb', [
      JSON.stringify({ action: 'plan_detail', id: plan.id, detail }),
    ]);
    expect(result.evolution.planDetails[plan.id].activities['2026-12-02']).toBe('Passeio e jantar');
    await expect(
      rpc('closet_apply', '$1::jsonb', [
        JSON.stringify({
          action: 'plan_detail',
          id: plan.id,
          detail: { ...detail, activities: { '2026-12-10': 'Fora do evento' } },
        }),
      ]),
    ).rejects.toThrow('Date outside plan');
  });
  it('requires recent verified OTP and an exact destructive confirmation', async () => {
    await auth(A, 'password');
    await expect(rpc('account_begin_erasure', '$1', ['EXCLUIR MINHA CONTA'])).rejects.toThrow();
    await auth(A, 'otp', SA, 700);
    await expect(rpc('account_begin_erasure', '$1', ['EXCLUIR MINHA CONTA'])).rejects.toThrow();
    await auth(A);
    await expect(rpc('account_begin_erasure', '$1', ['sim'])).rejects.toThrow();
    await expect(rpc('account_finish_erasure')).rejects.toThrow();
    expect(await rpc('account_begin_erasure', '$1', ['EXCLUIR MINHA CONTA'])).toEqual([
      { bucket: 'closet-photos', path: photo },
    ]);
    await expect(rpc('account_finish_erasure')).rejects.toThrow('MEDIA_REMAINING');
  });
  it('never erases another owner and finishes only after media removal', async () => {
    expect(
      (await db.query('delete from storage.objects where name=$1 returning name', [otherPhoto]))
        .rows,
    ).toHaveLength(0);
    await db.query('delete from storage.objects where name=$1', [photo]);
    await rpc('account_finish_erasure');
    await expect(rpc('account_export')).rejects.toThrow();
    await auth(B);
    const remaining = await rpc('account_export');
    expect(remaining.studio.items[0].name).toBe('Vestido privado B');
    expect(remaining.media).toHaveLength(1);
  });
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
  ])
    await db.exec(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  await db.exec(
    readFileSync(new URL('../supabase/ATUALIZACAO-ATELIE-7-A-9.sql', import.meta.url), 'utf8'),
  );
});
