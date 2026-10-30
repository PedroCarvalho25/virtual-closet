import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { identityFixtures } from '../../scripts/identity-fixtures.mjs';
import type { Item, OutfitRow, Post, WearLog } from '../../src/types/domain';
const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const origin = process.env.VIRTUAL_CLOSET_STATIC_ORIGIN || 'http://127.0.0.1:4174';
const now = () => new Date().toISOString();
async function mockSupabase(page: Page) {
  const items: Item[] = [];
  const outfits: (OutfitRow & { item_ids: string[] })[] = [];
  const wear: WearLog[] = [];
  const posts: Post[] = [];
  const identity = identityFixtures(USER, () => ({ posts }));
  const join = (outfit: (typeof outfits)[number]) => ({
    id: outfit.id,
    user_id: outfit.user_id,
    name: outfit.name,
    photo_path: outfit.photo_path,
    created_at: outfit.created_at,
    outfit_items: outfit.item_ids.map((id) => ({
      wardrobe_items: items.find((i) => i.id === id)!,
    })),
  });
  await page.route('https://closet-test.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const data = request.postDataJSON() as Record<string, unknown> | null;
    const respond = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
      });
    if (method === 'OPTIONS') {
      await respond({});
      return;
    }
    if (url.pathname.startsWith('/auth/')) {
      const user = {
        id: USER,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'teste@example.com',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: now(),
      };
      if (url.pathname.endsWith('/logout')) {
        await respond({});
        return;
      }
      if (url.pathname.endsWith('/user')) {
        await respond(user);
        return;
      }
      await respond({
        access_token: `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: USER, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fixture-refresh-only',
        user,
      });
      return;
    }
    if (url.pathname === '/preview/v1/identity') {
      await respond(identity.handle(data?.name, data?.args as object));
      return;
    }
    const table = url.pathname.split('/').at(-1);
    if (url.pathname === '/preview/v1/studio') {
      await respond({
        items: [],
        outfits: [],
        wear: [],
        prices: {},
        favorite_items: [],
        favorite_outfits: [],
        plans: [],
      });
      return;
    }
    const single = request.headers().accept?.includes('vnd.pgrst.object');
    const id = url.searchParams.get('id')?.replace('eq.', '');
    if (table === 'wardrobe_items') {
      if (method === 'POST') {
        const item = { ...data, archived_at: null, created_at: now() } as Item;
        items.unshift(item);
        await respond(single ? item : [item], 201);
        return;
      }
      if (method === 'PATCH') {
        const item = items.find((i) => i.id === id)!;
        Object.assign(item, data);
        await respond(single ? item : [item]);
        return;
      }
      let rows = items.filter(
        (i) =>
          (!id || i.id === id) &&
          (url.searchParams.get('archived_at') !== 'is.null' || !i.archived_at),
      );
      if (url.searchParams.has('category'))
        rows = rows.filter(
          (i) => i.category === url.searchParams.get('category')?.replace('eq.', ''),
        );
      const expression = url.searchParams.get('or');
      if (expression) {
        const q = expression.match(/%([^%]*)%/)?.[1]?.toLowerCase() || '';
        rows = rows.filter((i) => `${i.name} ${i.color}`.toLowerCase().includes(q));
      }
      await respond(single ? rows[0] : rows);
      return;
    }
    if (table === 'item_last_worn') {
      await respond(
        items.map((item) => ({
          item_id: item.id,
          last_worn_date:
            wear
              .filter((w) => outfits.find((o) => o.id === w.outfit_id)?.item_ids.includes(item.id))
              .map((w) => w.worn_date)
              .sort()
              .at(-1) || null,
        })),
      );
      return;
    }
    if (table === 'outfit_last_worn') {
      await respond(
        outfits.map((outfit) => ({
          outfit_id: outfit.id,
          last_worn_date:
            wear
              .filter((w) => w.outfit_id === outfit.id)
              .map((w) => w.worn_date)
              .sort()
              .at(-1) || null,
        })),
      );
      return;
    }
    if (table === 'create_outfit') {
      const outfit = {
        id: crypto.randomUUID(),
        user_id: USER,
        name: data?.p_name as string,
        photo_path: null,
        created_at: now(),
        item_ids: data?.p_item_ids as string[],
      };
      outfits.push(outfit);
      await respond(outfit.id);
      return;
    }
    if (table === 'outfits') {
      const rows = outfits.filter((o) => !id || id === o.id).map(join);
      await respond(single ? rows[0] : rows);
      return;
    }
    if (table === 'wear_log') {
      if (method === 'POST') {
        if (wear.some((w) => w.outfit_id === data?.outfit_id && w.worn_date === data?.worn_date)) {
          await respond({ code: '23505', message: 'duplicate' }, 409);
          return;
        }
        wear.push({ ...data, id: crypto.randomUUID(), created_at: now() } as WearLog);
        await respond(null, 201);
        return;
      }
      if (method === 'DELETE') {
        const index = wear.findIndex((w) => w.id === id);
        if (index >= 0) wear.splice(index, 1);
        await respond(null);
        return;
      }
      await respond(wear);
      return;
    }
    if (table === 'posts') {
      if (method === 'POST') {
        posts.unshift({ ...data, id: crypto.randomUUID(), created_at: now() } as Post);
        await respond(null, 201);
        return;
      }
      if (method === 'DELETE') {
        const index = posts.findIndex((p) => p.id === id);
        if (index >= 0) posts.splice(index, 1);
        await respond(null);
        return;
      }
      await respond(
        posts.map((p) => ({ ...p, outfits: join(outfits.find((o) => o.id === p.outfit_id)!) })),
      );
      return;
    }
    await respond({ message: `Unhandled fixture route ${table}` }, 500);
  });
  return { items, outfits, wear, posts };
}
async function login(page: Page) {
  await page.goto(origin);
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Entrar no meu closet', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await page.goto(`${origin}/wardrobe`);
  await expect(page.getByRole('heading', { name: 'Meu guarda-roupa' })).toBeVisible();
}
test('unconfigured app opens safely and explains the free iPhone path', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173');
  await expect(page.getByText('Falta conectar seu closet')).toBeVisible();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/01-configuracao.png', fullPage: true });
  await page.getByRole('button', { name: 'Como testar no meu iPhone?' }).click();
  await expect(page.getByText(/Instale o Expo Go pela App Store/)).toBeVisible();
  expect(errors).toEqual([]);
});
test('connected UI completes item, outfit, wear, post, archive, offline and logout flows', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const db = await mockSupabase(page);
  await login(page);
  await page.getByRole('button', { name: 'Adicionar peça', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar minha peça' }).click();
  await expect(page.getByText('Informe um nome com até 100 caracteres.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Nome da peça *', exact: true }).fill('Tênis de teste');
  await page.getByRole('button', { name: 'Adicionar marca ou caimento', exact: true }).click();
  await page.getByRole('button', { name: 'Boxy', exact: true }).click();
  await page.getByRole('button', { name: 'Tênis', exact: true }).click();
  await expect(page.getByText('Caimento · opcional')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Cor *', exact: true }).fill('Branco');
  await page.getByRole('textbox', { name: 'Numeração do calçado *', exact: true }).fill('40 BR');
  await page.getByRole('button', { name: 'Guardar minha peça' }).click();
  await expect(page.getByRole('heading', { name: 'Tênis de teste', exact: true })).toBeVisible();
  expect(db.items[0]?.fit).toBeNull();
  await page.getByRole('button', { name: 'Editar peça', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome da peça *', exact: true }).fill('Tênis branco');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('heading', { name: 'Tênis branco', exact: true })).toBeVisible();
  await page.goto(`${origin}/outfits`);
  await page.getByRole('button', { name: 'Criar outfit', exact: true }).click();
  await page.getByRole('button', { name: /Tênis branco, Branco, tamanho 40 BR/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome · opcional', exact: true }).fill('Domingo leve');
  await page.getByRole('button', { name: 'Salvar meu outfit' }).click();
  await expect(page.getByRole('heading', { name: 'Domingo leve', exact: true })).toBeVisible();
  expect(db.outfits).toHaveLength(1);
  await page.getByRole('button', { name: 'Usei este outfit' }).click();
  await page.getByRole('button', { name: 'Confirmar uso' }).click();
  await expect(page.getByText('Uso registrado. Seu histórico foi atualizado.')).toBeVisible();
  expect(db.wear).toHaveLength(1);
  await page.getByRole('button', { name: 'Usei este outfit' }).click();
  await page.getByRole('button', { name: 'Confirmar uso' }).click();
  await expect(page.getByText('Este outfit já foi registrado nesse dia.')).toBeVisible();
  expect(db.wear).toHaveLength(1);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar no meu feed' }).click();
  await page
    .getByRole('textbox', { name: 'Legenda · opcional', exact: true })
    .fill('Um look simples para um dia leve.');
  await page.getByRole('button', { name: 'Publicar só para mim' }).click();
  await expect(page.getByText('Um look simples para um dia leve.')).toBeVisible();
  expect(db.posts).toHaveLength(1);
  await page.screenshot({ path: 'docs/screenshots/04-feed-fixture.png', fullPage: true });
  await page.getByRole('button', { name: 'Remover post', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Nenhuma publicação')).toBeVisible();
  expect(db.posts).toHaveLength(0);
  expect(db.outfits).toHaveLength(1);
  expect(db.wear).toHaveLength(1);
  await page.goto(`${origin}/item/${db.items[0]!.id}`);
  await page.getByRole('button', { name: 'Arquivar peça', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restaurar ao guarda-roupa' })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar ao guarda-roupa' }).click();
  await expect(page.getByRole('button', { name: 'Arquivar peça', exact: true })).toBeVisible();
  await page.goto(`${origin}/wardrobe`);
  await expect(page.getByRole('button', { name: /Tênis branco, Branco/ })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/02-guarda-roupa-fixture.png', fullPage: true });
  await context.setOffline(true);
  await expect(page.getByText(/Você está offline. Busca e filtros/)).toBeVisible();
  await page.getByRole('button', { name: /Tênis branco, Branco/ }).click();
  await expect(page.getByRole('button', { name: 'Editar peça', exact: true })).toBeDisabled();
  await context.setOffline(false);
  await page.goto(`${origin}/calendar`);
  await expect(page.getByText('Domingo leve', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/03-calendario-fixture.png', fullPage: true });
  await page.getByRole('button', { name: 'Remover registro', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Registro removido. Histórico atualizado.')).toBeVisible();
  expect(db.wear).toHaveLength(0);
  await page.goto(`${origin}/account`);
  await page.getByRole('button', { name: 'Sair da minha conta' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar no meu closet' })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('virtual-closet-cache-v1:')),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});
test('offline logout stays signed out after reload and a new interactive login still works', async ({
  page,
  context,
}) => {
  await mockSupabase(page);
  await login(page);
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Sair da minha conta' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar no meu closet' })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar no meu closet' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('virtual-closet-auth-v1'))).toBeNull();
  await login(page);
});
test('small screen keeps controls within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mockSupabase(page);
  await login(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto(`${origin}/calendar`);
  await expect(page.getByRole('heading', { name: 'O que você vestiu?' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
