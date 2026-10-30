import { expect, test, type Page } from '@playwright/test';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4235';
async function open(page: Page, target = true) {
  const html = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)![1]!;
  await page.request.post(`${origin}/__reset`, {
    headers: { 'X-Closet-Nonce': nonce },
    data: { showcaseAccount: target },
  });
  await page.goto(`${origin}/preview-app?start=account`);
  await expect(
    page.getByText(target ? 'Armando Pinto' : 'Lia Oliveira', { exact: true }),
  ).toBeVisible();
}
async function snapshot(page: Page) {
  return (await page.request.get(`${origin}/__fixture/preview/v1/studio`)).json();
}
const finished = (page: Page) =>
  expect(page.getByText('Seu closet de apresentação está pronto.', { exact: true })).toBeVisible({
    timeout: 60000,
  });

test('prepares 20 pieces, five coordinated looks and private examples while preserving existing data', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 844 });
  await open(page);
  const before = await snapshot(page);
  await page.request.put(`${origin}/__fixture/auth/v1/user`, {
    data: {
      data: { closet_greeting: { sex: 'male', preferredName: 'Mando', usePreferredName: true } },
    },
  });
  await page.getByRole('button', { name: 'Preparar conta de apresentação', exact: true }).click();
  await expect(page.getByText(/12 fotografias reais e 8 ilustrações/)).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar acervo à minha conta', exact: true }).click();
  await finished(page);
  const after = await snapshot(page);
  expect(after.items).toHaveLength(before.items.length + 20);
  expect(after.outfits).toHaveLength(before.outfits.length + 5);
  expect(after.wear).toHaveLength(before.wear.length + 5);
  expect(after.plans).toHaveLength(before.plans.length + 2);
  for (const item of before.items)
    expect(after.items.find((i: { id: string }) => i.id === item.id)).toEqual(item);
  for (const outfit of after.outfits.filter(
    (o: { id: string }) => !before.outfits.some((b: { id: string }) => b.id === o.id),
  ))
    expect(outfit.items).toHaveLength(4);
  const imported = after.items.filter(
    (i: { id: string }) => !before.items.some((b: { id: string }) => b.id === i.id),
  );
  for (const item of imported) {
    expect(after.evolution.details[item.id].story).toContain('Fonte:');
    const photo = await page.request.get(
      `${origin}/__fixture/storage/v1/object/sign/closet-photos/${item.photo_path}?token=preview`,
    );
    expect(photo.status()).toBe(200);
    expect((await photo.body()).length).toBeGreaterThan(1000);
  }
  const user = await (await page.request.get(`${origin}/__fixture/auth/v1/user`)).json();
  expect(user.user_metadata.closet_greeting.preferredName).toBe('Mando');
  expect(user.user_metadata.closet_showcase_v1.completed).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/67-conta-apresentacao.png' });
  await page.getByRole('button', { name: '4 · Comunidade de exemplo (12)', exact: true }).click();
  await expect(page.getByText('@demo.nina.cor · fictício', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover exemplo de Nina Cor', exact: true }).click();
  await expect(page.getByText('Comunidade de exemplo · 11', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Comunidade de exemplo · 11', { exact: true })).toBeVisible();
  await page.goto(`${origin}/account-demo`);
  await page.getByRole('button', { name: 'Ocultar seguidores de exemplo', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Mostrar seguidores de exemplo', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Conferir e completar acervo', exact: true }).click();
  await finished(page);
  expect(await snapshot(page)).toEqual(after);
  await expect(
    page.getByRole('button', { name: 'Mostrar seguidores de exemplo', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Restaurar os 12 perfis de exemplo', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '4 · Comunidade de exemplo (12)', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '1 · Explorar as peças', exact: true }).click();
  await expect(page.getByText('Calça de alfaiataria cinza', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/68-acervo-apresentacao.png' });
});

test('resumes after item insertion fails following upload and after an outfit response is lost', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await open(page);
  const before = await snapshot(page);
  let failItem = true,
    failOutfit = true,
    storageDuplicates = 0;
  context.on('response', (r) => {
    if (r.url().includes('/storage/') && r.status() === 409) storageDuplicates++;
  });
  await context.route('**/__fixture/rest/v1/wardrobe_items', async (route) => {
    if (route.request().method() === 'POST' && failItem) {
      failItem = false;
      return route.fulfill({ status: 503, json: { message: 'Temporary network failure' } });
    }
    return route.continue();
  });
  await context.route('**/__fixture/rest/v1/rpc/create_outfit', async (route) => {
    if (failOutfit) {
      failOutfit = false;
      await route.fetch(); // The server persisted the outfit; its response never reaches the app.
      return route.fulfill({ status: 503, json: { message: 'Temporary network failure' } });
    }
    return route.continue();
  });
  await page.getByRole('button', { name: 'Preparar conta de apresentação', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar acervo à minha conta', exact: true }).click();
  await expect(
    page.getByText('Não foi possível conectar. Confira sua internet e tente novamente.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continuar preparação', exact: true }).click();
  await expect
    .poll(async () => (await snapshot(page)).outfits.length)
    .toBe(before.outfits.length + 1);
  await expect(
    page.getByText('Não foi possível conectar. Confira sua internet e tente novamente.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continuar preparação', exact: true }).click();
  await finished(page);
  const after = await snapshot(page);
  expect(after.items).toHaveLength(before.items.length + 20);
  expect(after.outfits).toHaveLength(before.outfits.length + 5);
  expect(after.wear).toHaveLength(before.wear.length + 5);
  expect(after.plans).toHaveLength(before.plans.length + 2);
  expect(storageDuplicates).toBeGreaterThan(0);
});

test('ordinary accounts cannot start the targeted import or see fictional followers', async ({
  page,
}) => {
  await open(page, false);
  const before = await snapshot(page);
  await expect(
    page.getByRole('button', { name: 'Preparar conta de apresentação', exact: true }),
  ).toHaveCount(0);
  await page.goto(`${origin}/account-demo`);
  await expect(
    page.getByText('Entre como @oarmandopintoofc para preparar esta conta.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Adicionar acervo à minha conta', exact: true }),
  ).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
});
