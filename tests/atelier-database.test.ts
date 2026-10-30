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
  ])
    await db.exec(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
});

const action = (value: object) => rpc('atelier_action', '$1::jsonb', [JSON.stringify(value)]);
afterAll(async () => db?.close());
describe('atelier privacy, collaboration and immutable looks', () => {
  let collection: any, publication: string, design: any;
  const item = '11111111-1234-4123-8123-123456789000';
  const designId = '11111111-1234-4123-8123-123456789001';
  it('requires verified login and keeps direct tables inaccessible', async () => {
    await auth(null);
    await expect(action({ action: 'list' })).rejects.toThrow();
    await auth(A, 'password');
    await expect(action({ action: 'list' })).rejects.toThrow();
    await auth(A);
    await verify();
    await save(draft('pedro.um'));
    await expect(db.query('select * from public.atelier_designs')).rejects.toThrow();
    await auth(B);
    await verify(DB);
    await save(draft('pedro.dois'));
    await auth(A);
    publication = (await rpc('social_query', '$1::jsonb', ['{}'])).items[0].id;
    collection = await action({ action: 'create_collection', title: 'Minha nova fase' });
    collection = await action({
      action: 'add_entry',
      id: collection.id,
      revision: collection.revision,
      publicationId: publication,
    });
    expect(collection.entries).toHaveLength(1);
  });
  it('keeps collections private, detects edit conflicts and allows multiple collections', async () => {
    await auth(B);
    expect((await action({ action: 'list' })).collections).toHaveLength(0);
    await expect(action({ action: 'get_collection', id: collection.id })).rejects.toThrow();
    await auth(A);
    await expect(
      action({
        action: 'entry_note',
        id: collection.id,
        revision: 1,
        publicationId: publication,
        note: 'lost',
      }),
    ).rejects.toThrow('CONFLICT');
    const second = await action({ action: 'create_collection', title: 'Outra história' });
    expect(
      (
        await action({
          action: 'add_entry',
          id: second.id,
          revision: second.revision,
          publicationId: publication,
        })
      ).entries,
    ).toHaveLength(1);
  });
  it('enforces explicit member roles, revocation and bilateral blocks', async () => {
    await expect(
      action({ action: 'grant', id: collection.id, userId: B, role: 'edit' }),
    ).rejects.toThrow('FRIEND_REQUIRED');
    await rpc('profile_connect', '$1,$2', [B, 'follow']);
    await auth(B);
    await rpc('profile_connect', '$1,$2', [A, 'follow']);
    await auth(A);
    await action({ action: 'grant', id: collection.id, userId: B, role: 'view' });
    await auth(B);
    expect((await action({ action: 'get_collection', id: collection.id })).entries).toHaveLength(1);
    await expect(
      action({
        action: 'remove_entry',
        id: collection.id,
        revision: collection.revision,
        publicationId: publication,
      }),
    ).rejects.toThrow('EDIT_REQUIRED');
    expect(
      (await action({ action: 'comment', id: collection.id, body: 'Com suas peças azuis' }))
        .comments,
    ).toHaveLength(1);
    await auth(A);
    await action({ action: 'grant', id: collection.id, userId: B, role: 'edit' });
    await auth(B);
    collection = await action({
      action: 'entry_note',
      id: collection.id,
      revision: collection.revision,
      publicationId: publication,
      note: 'Uma camada nova',
    });
    await expect(action({ action: 'feature', id: collection.id, active: true })).rejects.toThrow(
      'OWNER_REQUIRED',
    );
    await auth(A);
    await action({ action: 'revoke', id: collection.id, userId: B });
    await auth(B);
    await expect(action({ action: 'get_collection', id: collection.id })).rejects.toThrow();
    await auth(A);
    await action({ action: 'grant', id: collection.id, userId: B, role: 'view' });
    await rpc('profile_connect', '$1,$2', [B, 'block']);
    await auth(B);
    await expect(action({ action: 'get_collection', id: collection.id })).rejects.toThrow();
    await auth(A);
  });
  it('validates owned garments, geometry and source references in private drafts', async () => {
    await db.query(
      "insert into public.wardrobe_items(id,user_id,name,category,color,size) values($1,$2,'Camiseta','camiseta','Branco','M')",
      [item, A],
    );
    const layer = {
      id: 'layer-1',
      kind: 'item',
      target: item,
      x: 10,
      y: 20,
      width: 120,
      height: 180,
      rotation: 0,
    };
    design = {
      id: designId,
      title: 'Minha versão',
      note: '',
      revision: 0,
      sourceId: publication,
      parentId: null,
      outfitId: null,
      layers: [layer, { ...layer, id: 'reference', kind: 'reference', target: publication }],
    };
    await expect(
      action({
        action: 'save_design',
        id: designId,
        design: { ...design, layers: [{ ...layer, x: -10 }] },
      }),
    ).rejects.toThrow('INVALID_GEOMETRY');
    await auth(B);
    await expect(action({ action: 'save_design', id: designId, design })).rejects.toThrow(
      'ITEM_UNAVAILABLE',
    );
    await auth(A);
    design = await action({ action: 'save_design', id: designId, design });
    await auth(B);
    expect((await action({ action: 'list' })).designs).toHaveLength(0);
    await expect(
      action({ action: 'save_outfit', id: designId, revision: design.revision }),
    ).rejects.toThrow();
    await auth(A);
  });
  it('saves only owned clothes as a look, handles retries and freezes the composition', async () => {
    design = await action({ action: 'save_outfit', id: designId, revision: design.revision });
    expect(design.outfitId).toBeTruthy();
    const entries = await db.query('select item_id from public.outfit_items where outfit_id=$1', [
      design.outfitId,
    ]);
    expect(entries.rows).toEqual([{ item_id: item }]);
    expect((await action({ action: 'save_outfit', id: designId, revision: 1 })).outfitId).toBe(
      design.outfitId,
    );
    await expect(action({ action: 'save_design', id: designId, design })).rejects.toThrow(
      'CONFLICT',
    );
    const branch = { ...design, revision: 0, parentId: designId, outfitId: null };
    const next = await action({
      action: 'save_design',
      id: '11111111-1234-4123-8123-123456789002',
      design: branch,
    });
    expect(next.parentId).toBe(designId);
    expect(next.outfitId).toBeNull();
    await action({ action: 'delete_design', id: designId });
    expect(
      (await db.query('select id from public.outfits where id=$1', [design.outfitId])).rows,
    ).toHaveLength(1);
  });
});
