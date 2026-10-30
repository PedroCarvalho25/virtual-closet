import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let db: PGlite;
let aItem: string;
let bItem: string;
let archivedItem: string;
let outfit: string;
let bOutfit: string;
async function user(id: string | null) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id || '']);
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
}
async function count(table: string) {
  const result = await db.query<{ count: number }>(
    `select count(*)::int as count from public.${table}`,
  );
  return result.rows[0]!.count;
}
async function newItem(owner: string, name: string) {
  const result = await db.query<{ id: string }>(
    "insert into public.wardrobe_items(user_id,name,category,color,size) values($1,$2,'camiseta','Branco','M') returning id",
    [owner, name],
  );
  return result.rows[0]!.id;
}
async function create(ids: string[]) {
  const result = await db.query<{ id: string }>(
    'select public.create_outfit($1::uuid[], $2, null) as id',
    [ids, 'Meu outfit'],
  );
  return result.rows[0]!.id;
}
beforeAll(async () => {
  db = new PGlite();
  // Real PostgreSQL engine. Only Supabase's auth/storage infrastructure is stubbed;
  // the application's exact migration, grants, policies and functions run intact.
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    alter table storage.objects enable row level security;
    grant usage on schema public,auth,storage to anon,authenticated;
    grant all on storage.objects to anon,authenticated;
    insert into auth.users values('${A}'),('${B}');
  `);
  await db.exec(
    readFileSync(
      new URL('../supabase/migrations/202610050001_initial.sql', import.meta.url),
      'utf8',
    ),
  );
  await user(A);
  aItem = await newItem(A, 'Peça de A');
  archivedItem = await newItem(A, 'Arquivada');
  await db.query('update public.wardrobe_items set archived_at = now() where id=$1', [
    archivedItem,
  ]);
  outfit = await create([aItem]);
  await user(B);
  bItem = await newItem(B, 'Peça de B');
  bOutfit = await create([bItem]);
});
afterAll(async () => {
  await db?.close();
});
describe('migration authorization and integrity', () => {
  it('denies anonymous reads and calls', async () => {
    await user(null);
    await expect(db.query('select * from public.wardrobe_items')).rejects.toThrow();
    await expect(create([aItem])).rejects.toThrow();
  });
  it('isolates owners and denies transferring or deleting an item', async () => {
    await user(A);
    expect(await count('wardrobe_items')).toBe(2);
    expect(
      (await db.query('select * from public.wardrobe_items where id=$1', [bItem])).rows,
    ).toEqual([]);
    await expect(newItem(B, 'Invasão')).rejects.toThrow();
    await expect(
      db.query('update public.wardrobe_items set user_id=$1 where id=$2', [B, aItem]),
    ).rejects.toThrow();
    await expect(
      db.query('delete from public.wardrobe_items where id=$1', [aItem]),
    ).rejects.toThrow();
    expect(
      (
        await db.query('update public.wardrobe_items set name=$1 where id=$2 returning id', [
          'Invasão',
          bItem,
        ])
      ).rows,
    ).toEqual([]);
  });
  it('enforces required fields, sneaker fit and photo ownership in direct inserts', async () => {
    await user(A);
    await expect(newItem(A, '   ')).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.wardrobe_items(user_id,name,category,color,size,fit) values($1,'Tênis','tenis','Branco','40','boxy')",
        [A],
      ),
    ).rejects.toThrow();
    await expect(
      db.query('update public.wardrobe_items set photo_path=$1 where id=$2', [
        `${B}/items/${bItem}.jpg`,
        aItem,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query('update public.wardrobe_items set photo_path=$1 where id=$2', [
        `${A}/items/../${bItem}.jpg`,
        aItem,
      ]),
    ).rejects.toThrow();
  });
  it('creates complete outfits and rolls back invalid selections', async () => {
    await user(A);
    const before = await count('outfits');
    for (const ids of [[], [aItem, aItem], [bItem], [aItem, bItem], [aItem, archivedItem]])
      await expect(create(ids)).rejects.toThrow();
    expect(await count('outfits')).toBe(before);
    const good = await create([aItem]);
    expect(
      (await db.query('select * from public.outfit_items where outfit_id=$1', [good])).rows,
    ).toHaveLength(1);
  });
  it('prevents direct creation and every composition mutation', async () => {
    await user(A);
    await expect(db.query('insert into public.outfits(user_id) values($1)', [A])).rejects.toThrow();
    await expect(
      db.query('insert into public.outfit_items values($1,$2)', [outfit, bItem]),
    ).rejects.toThrow();
    await expect(
      db.query('update public.outfit_items set item_id=$1 where outfit_id=$2', [bItem, outfit]),
    ).rejects.toThrow();
    await expect(
      db.query('delete from public.outfit_items where outfit_id=$1', [outfit]),
    ).rejects.toThrow();
    await expect(db.query('delete from public.outfits where id=$1', [outfit])).rejects.toThrow();
  });
  it('checks ownership of referenced outfits in wear and posts', async () => {
    await user(A);
    await expect(
      db.query(
        "insert into public.wear_log(user_id,outfit_id,worn_date) values($1,$2,'2020-01-01')",
        [A, bOutfit],
      ),
    ).rejects.toThrow();
    await expect(
      db.query('insert into public.posts(user_id,outfit_id) values($1,$2)', [A, bOutfit]),
    ).rejects.toThrow();
    await expect(
      db.query('insert into public.posts(user_id,outfit_id) values($1,$2)', [B, outfit]),
    ).rejects.toThrow();
  });
  it('derives last worn, rejects duplicates/future use, and recalculates after removal', async () => {
    await user(A);
    await db.query("select set_config('request.headers', $1, false)", [
      JSON.stringify({ 'x-client-timezone': 'America/Sao_Paulo' }),
    ]);
    await db.query(
      "insert into public.wear_log(user_id,outfit_id,worn_date) values($1,$2,'2020-01-01'),($1,$2,'2020-02-01')",
      [A, outfit],
    );
    await expect(
      db.query(
        "insert into public.wear_log(user_id,outfit_id,worn_date) values($1,$2,'2020-02-01')",
        [A, outfit],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        'insert into public.wear_log(user_id,outfit_id,worn_date) values($1,$2,current_date + 10)',
        [A, outfit],
      ),
    ).rejects.toThrow();
    const last = () =>
      db.query<{ last: string }>(
        'select last_worn_date::text as last from public.item_last_worn where item_id=$1',
        [aItem],
      );
    expect((await last()).rows[0]?.last).toBe('2020-02-01');
    await db.query("delete from public.wear_log where worn_date='2020-02-01' and outfit_id=$1", [
      outfit,
    ]);
    expect((await last()).rows[0]?.last).toBe('2020-01-01');
    await db.query('update public.wardrobe_items set archived_at=now() where id=$1', [aItem]);
    expect((await last()).rows[0]?.last).toBe('2020-01-01');
    expect(
      (await db.query('select * from public.outfit_items where outfit_id=$1', [outfit])).rows,
    ).toHaveLength(1);
    const second = await db.query<{ id: string }>('select id from public.outfits where id<>$1', [
      outfit,
    ]);
    await db.query(
      "insert into public.wear_log(user_id,outfit_id,worn_date) values($1,$2,'2020-01-01')",
      [A, second.rows[0]!.id],
    );
  });
  it('does not leak derived dates or compositions to the other user', async () => {
    await user(B);
    expect(
      (await db.query('select * from public.item_last_worn where item_id=$1', [aItem])).rows,
    ).toEqual([]);
    expect(
      (await db.query('select * from public.outfit_last_worn where outfit_id=$1', [outfit])).rows,
    ).toEqual([]);
    expect(
      (await db.query('select * from public.outfit_items where outfit_id=$1', [outfit])).rows,
    ).toEqual([]);
  });
  it('removes only the post, preserving outfit and history', async () => {
    await user(A);
    const before = await count('wear_log');
    const created = await db.query<{ id: string }>(
      'insert into public.posts(user_id,outfit_id,caption) values($1,$2,$3) returning id',
      [A, outfit, 'Meu look'],
    );
    const id = created.rows[0]!.id;
    await user(B);
    expect(
      (await db.query('delete from public.posts where id=$1 returning id', [id])).rows,
    ).toEqual([]);
    await user(A);
    await db.query('delete from public.posts where id=$1', [id]);
    expect(await count('wear_log')).toBe(before);
    expect(
      (await db.query('select * from public.outfits where id=$1', [outfit])).rows,
    ).toHaveLength(1);
  });
  it('keeps bucket private and restricts object access to owner paths', async () => {
    await user(A);
    const path = `${A}/items/${aItem}.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('closet-photos',$1)", [
      path,
    ]);
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values('closet-photos',$1)", [
        `${B}/items/${bItem}.jpg`,
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query('update storage.objects set name=$1 where name=$2 returning id', [
          path,
          path,
        ])
      ).rows,
    ).toEqual([]);
    await user(B);
    expect((await db.query('select * from storage.objects')).rows).toEqual([]);
    expect(
      (await db.query('delete from storage.objects where name=$1 returning id', [path])).rows,
    ).toEqual([]);
    await db.exec('reset role');
    expect(
      (
        await db.query<{ public: boolean }>(
          "select public from storage.buckets where id='closet-photos'",
        )
      ).rows[0]?.public,
    ).toBe(false);
  });
});
