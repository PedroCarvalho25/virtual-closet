import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { showcaseItems, showcaseLooks } from '@/showcase/model';
import { emptyDetail } from '@/evolution/types';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let db: PGlite, aItem: string, bItem: string, outfit: string;
async function user(id: string | null) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
}
async function act(action: unknown) {
  return (
    await db.query<{ data: any }>('select public.closet_apply($1::jsonb) data', [
      JSON.stringify(action),
    ])
  ).rows[0]!.data;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;alter table storage.objects enable row level security;grant usage on schema public,auth,storage to anon,authenticated;grant all on storage.objects to anon,authenticated;insert into auth.users values('${A}'),('${B}');`,
  );
  for (const migration of [
    '202610050001_initial.sql',
    '202610090001_style_studio.sql',
    '202610090002_style_circles.sql',
  ])
    await db
      .exec(readFileSync(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'))
      .catch((error) => {
        const sql = readFileSync(
          new URL(`../supabase/migrations/${migration}`, import.meta.url),
          'utf8',
        );
        const position = Number(error.position || error.internalPosition || 0);
        throw new Error(
          `${migration}: ${error.message}; ${error.where || ''}; position ${position}; ${sql.slice(Math.max(0, position - 160), position + 160)}`,
        );
      });
  await user(A);
  aItem = (
    await db.query<{ id: string }>(
      "insert into public.wardrobe_items(user_id,name,category,color,size) values($1,'Camisa A','camisa','Branco','M') returning id",
      [A],
    )
  ).rows[0]!.id;
  outfit = (await db.query<{ id: string }>('select public.create_outfit($1::uuid[]) id', [[aItem]]))
    .rows[0]!.id;
  await user(B);
  bItem = (
    await db.query<{ id: string }>(
      "insert into public.wardrobe_items(user_id,name,category,color,size) values($1,'Camisa B','camisa','Azul','M') returning id",
      [B],
    )
  ).rows[0]!.id;
});
afterAll(async () => db?.close());
it('accepts all showcase garments, credited details, coordinated outfits and plans under existing database rules', async () => {
  await user(A);
  await db.exec('begin');
  try {
    const ids: Record<string, string> = {};
    for (const item of showcaseItems) {
      const row = await db.query<{ id: string }>(
        'insert into public.wardrobe_items(user_id,name,category,color,size,fit) values($1,$2,$3,$4,$5,$6) returning id',
        [A, item.name, item.category, item.color, item.size, item.fit],
      );
      ids[item.key] = row.rows[0]!.id;
      await act({
        action: 'item_detail',
        id: ids[item.key],
        detail: {
          ...emptyDetail,
          location: 'Acervo de apresentação',
          story: `Peça de demonstração; tamanho e modelagem são exemplos. ${item.credit}. ${item.license}. Fonte: ${item.source}`,
          care: 'Consulte a etiqueta da peça real.',
        },
      });
    }
    for (const look of showcaseLooks) {
      const row = await db.query<{ id: string }>(
        'select public.create_outfit($1::uuid[],$2,null) id',
        [look.items.map((key) => ids[key]), look.name],
      );
      const lookId = row.rows[0]!.id;
      await db.query(
        'insert into public.wear_log(user_id,outfit_id,worn_date,notes) values($1,$2,current_date-1,$3)',
        [A, lookId, `Uso fictício para demonstração. ${look.note}`],
      );
      const snapshot = await act({
        action: 'plan',
        plan: {
          id: lookId,
          title: 'Passeio · exemplo',
          date: '2026-10-20',
          end_date: '2026-10-20',
          kind: 'day',
          outfit_ids: [lookId],
          item_ids: [],
          notes: 'Plano fictício para apresentação do Virtual Closet.',
          reminder: false,
        },
      });
      expect(snapshot.outfits.find((o: { id: string }) => o.id === lookId).items).toHaveLength(4);
    }
    expect(Object.keys(ids)).toHaveLength(20);
  } finally {
    await db.exec('rollback');
  }
});
describe('incremental studio authorization', () => {
  it('refuses anonymous reads and actions', async () => {
    await user(null);
    await expect(act({ action: 'clear_learning' })).rejects.toThrow();
    await expect(db.query('select public.closet_snapshot()')).rejects.toThrow();
  });
  it('persists prices including zero while missing remains unknown', async () => {
    await user(A);
    let s = await act({ action: 'price', id: aItem, cents: 0 });
    expect(s.prices[aItem]).toBe(0);
    s = await act({ action: 'price', id: aItem, cents: null });
    expect(s.prices[aItem]).toBeUndefined();
    await expect(act({ action: 'price', id: aItem, cents: -1 })).rejects.toThrow();
    await expect(act({ action: 'price', id: aItem, cents: 1.5 })).rejects.toThrow();
  });
  it('rejects foreign references and direct writes even to own rows', async () => {
    await user(A);
    await expect(act({ action: 'price', id: bItem, cents: 10 })).rejects.toThrow();
    await expect(
      db.query('update public.closet_item_meta set user_id=$1 where item_id=$2', [B, aItem]),
    ).rejects.toThrow();
    await expect(
      db.query("insert into public.closet_documents(user_id,kind,payload) values($1,'wish','{}')", [
        A,
      ]),
    ).rejects.toThrow();
  });
  it('returns only the callers inventory even from the definer write RPC', async () => {
    await user(A);
    const a = await act({ action: 'favorite_item', id: aItem });
    expect(a.items.map((i: any) => i.id)).toEqual([aItem]);
    await user(B);
    const b = await act({ action: 'favorite_item', id: bItem });
    expect(b.items.map((i: any) => i.id)).toEqual([bItem]);
    expect(b.favorite_items).not.toContain(aItem);
  });
  it('plans cannot borrow another accounts outfits or change wear history', async () => {
    await user(A);
    const p = {
      title: 'Viagem',
      date: '2027-01-01',
      end_date: '2027-01-02',
      kind: 'trip',
      outfit_ids: [outfit],
      item_ids: [],
      notes: '',
      reminder: false,
    };
    let s = await act({ action: 'plan', plan: p });
    expect(s.plans).toHaveLength(1);
    expect(s.wear).toHaveLength(0);
    await expect(act({ action: 'plan', plan: { ...p, item_ids: [bItem] } })).rejects.toThrow();
    s = await act({ action: 'remove_plan', id: s.plans[0].id });
    expect(s.plans).toHaveLength(0);
  });
  it('requires actual use before accepting feedback and allows erasing learning', async () => {
    await user(A);
    const f = {
      id: '11111111-1111-4111-8111-000000000900',
      outfitId: outfit,
      date: '2020-01-01',
      comfort: true,
      confidence: true,
      weather: true,
      occasion: true,
      again: true,
      note: '',
    };
    await expect(act({ action: 'feedback', feedback: f })).rejects.toThrow();
    await db.query('insert into public.wear_log(user_id,outfit_id,worn_date) values($1,$2,$3)', [
      A,
      outfit,
      f.date,
    ]);
    let s = await act({ action: 'feedback', feedback: f });
    expect(s.evolution.feedback).toHaveLength(1);
    s = await act({ action: 'clear_learning' });
    expect(s.evolution.feedback).toEqual([]);
    expect(s.wear).toHaveLength(1);
  });
  it('validates packing membership and days against the saved event', async () => {
    await user(A);
    const s = await act({
      action: 'plan',
      plan: {
        title: 'Mala',
        date: '2027-01-01',
        end_date: '2027-01-03',
        kind: 'trip',
        outfit_ids: [outfit],
        item_ids: [],
        notes: '',
        reminder: false,
      },
    });
    const id = s.plans.find((p: any) => p.title === 'Mala').id;
    const detail = {
      packed: [aItem],
      backupOutfitIds: [],
      days: { '2027-01-02': [outfit] },
      tasks: ['Lavar camisa'],
    };
    expect(
      (await act({ action: 'plan_detail', id, detail })).evolution.planDetails[id].packed,
    ).toEqual([aItem]);
    await expect(
      act({ action: 'plan_detail', id, detail: { ...detail, packed: [bItem] } }),
    ).rejects.toThrow();
    await expect(
      act({ action: 'plan_detail', id, detail: { ...detail, days: { '2028-01-01': [outfit] } } }),
    ).rejects.toThrow();
    const edited = await act({
      action: 'plan',
      plan: { ...s.plans.find((p: any) => p.id === id), date: '2027-01-03' },
    });
    expect(edited.evolution.planDetails[id].days).toEqual({});
    expect(edited.evolution.planDetails[id].packed).toEqual([aItem]);
    expect(edited.evolution.planDetails[id].tasks).toEqual(['Lavar camisa']);
  });
  it('enforces the daily lab limit on the server and rejects non-string fields', async () => {
    await user(A);
    const date = (await db.query<{ today: string }>("select (now() at time zone 'UTC')::date::text today")).rows[0]!
      .today;
    for (let i = 0; i < 3; i++)
      await act({
        action: 'decision',
        decision: {
          kind: 'lab',
          date,
          reason: 'A',
          itemIds: [aItem],
          outfitId: null,
          recipeId: null,
        },
      });
    await expect(
      act({ action: 'decision', decision: { kind: 'lab', date, reason: 'A', itemIds: [aItem] } }),
    ).rejects.toThrow();
    await expect(
      act({
        action: 'recipe',
        recipe: {
          title: 123,
          folder: 'Pasta',
          source: '',
          note: '',
          slots: [{ role: 'top', category: 'camisa', color: 'Branco' }],
        },
      }),
    ).rejects.toThrow();
    await expect(
      act({
        action: 'recipe',
        recipe: {
          title: 'Teste',
          folder: 'Pasta',
          source: '',
          note: '',
          slots: [{ role: 'bottom', category: 'camisa', color: 'Branco' }],
        },
      }),
    ).rejects.toThrow();
  });
  it('isolates recipes and rejects taking over an existing document ID', async () => {
    await user(A);
    const r = {
      id: '11111111-1111-4111-8111-000000000901',
      title: 'Receita',
      folder: 'Trabalho',
      source: 'https://example.com/look',
      note: '',
      slots: [{ role: 'top', category: 'camisa', color: 'Branco' }],
    };
    let s = await act({ action: 'recipe', recipe: r });
    expect(s.evolution.recipes).toHaveLength(1);
    await user(B);
    await expect(act({ action: 'recipe', recipe: r })).rejects.toThrow();
    s = await act({ action: 'remove_recipe', id: r.id });
    expect(s.evolution.recipes).toEqual([]);
    await user(A);
    expect((await act({ action: 'favorite_outfit', id: outfit })).evolution.recipes).toHaveLength(
      1,
    );
  });
  it('rejects arbitrary actions and invalid source links', async () => {
    await user(A);
    await expect(act({ action: 'execute', sql: 'select 1' })).rejects.toThrow();
    await expect(
      act({
        action: 'wish',
        wish: {
          title: 'Teste',
          category: 'camiseta',
          color: 'Branco',
          note: '',
          source: 'javascript:alert(1)',
          price: null,
          reflectUntil: null,
        },
      }),
    ).rejects.toThrow();
  });
  it('circles require membership, single-use invitations and redact private item data', async () => {
    const social = async (action: unknown) =>
      (
        await db.query<{ data: any }>('select public.circle_action($1::jsonb) data', [
          JSON.stringify(action),
        ])
      ).rows[0]!.data;
    await user(A);
    let s = await social({ action: 'create', title: 'Amigos', name: 'Pedro' });
    const circleId = s.circles[0].id;
    await user(B);
    expect(
      (await db.query<{ data: any }>('select public.circles_snapshot() data')).rows[0]!.data
        .circles,
    ).toEqual([]);
    await expect(
      social({
        action: 'message',
        circleId,
        kind: 'comment',
        body: 'Invasão',
        outfitIds: [],
        parentId: null,
      }),
    ).rejects.toThrow();
    await user(A);
    s = await social({ action: 'invite', circleId });
    const token = s.invite;
    await user(B);
    s = await social({ action: 'join', token, name: 'Bia' });
    expect(s.circles[0].members).toHaveLength(2);
    await expect(social({ action: 'join', token, name: 'Bia' })).rejects.toThrow();
    await expect(
      social({
        action: 'message',
        circleId,
        kind: 'recipe',
        body: 'Roupa alheia',
        outfitIds: [outfit],
        parentId: null,
      }),
    ).rejects.toThrow();
    await user(A);
    s = await social({
      action: 'message',
      circleId,
      kind: 'recipe',
      body: 'Minha receita',
      outfitIds: [outfit],
      parentId: null,
    });
    const card = s.circles[0].messages[0].cards[0];
    expect(Object.keys(card).sort()).toEqual(['slots', 'title']);
    expect(Object.keys(card.slots[0]).sort()).toEqual(['category', 'color', 'role']);
    expect(JSON.stringify(card)).not.toContain(aItem);
    await user(B);
    s = await social({ action: 'leave', circleId });
    expect(s.circles).toEqual([]);
    await expect(social({ action: 'invite', circleId })).rejects.toThrow();
  });
});
