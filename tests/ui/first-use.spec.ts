import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4175';
const snapshot = async (page: Page) =>
  (await page.request.get(`${origin}/__fixture/preview/v1/studio`)).json();
async function start(page: Page, empty = true) {
  const document = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = document.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  const reset = await page.request.post(`${origin}/__reset`, {
    headers: { 'X-Closet-Nonce': nonce! },
    data: { empty },
  });
  expect(reset.ok()).toBe(true);
  await page.goto(`${origin}/preview-app`);
  await expect(
    page.getByRole('heading', {
      name: empty ? 'Seu closet.' : 'Seu closet.',
    }),
  ).toBeVisible();
}
async function addPiece(page: Page, name: string, photo: boolean) {
  await page.getByRole('textbox', { name: 'Nome da peça *', exact: true }).fill(name);
  await page.getByRole('textbox', { name: 'Cor *', exact: true }).fill('Branco');
  await page.getByRole('textbox', { name: 'Tamanho *', exact: true }).fill('M');
  await expect(page.getByText('Caimento · opcional', { exact: true })).toHaveCount(0);
  if (photo) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Galeria', exact: true }).click();
    await (await chooser).setFiles(path.resolve('docs/preview-assets/tee.jpg'));
    await expect(page.getByRole('button', { name: 'Remover foto', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Guardar e continuar', exact: true }).click();
  await expect(page.getByText('Peça adicionada.', { exact: true })).toBeVisible();
}
test('first look starts with two pieces, persists after login, and only explicit wear completes the journey', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  await page.screenshot({ path: 'docs/screenshots/30-primeiro-acesso.png', fullPage: true });
  await page.getByRole('button', { name: 'Montar look', exact: true }).click();
  await addPiece(page, 'Minha primeira camiseta', true);
  await expect(page.getByText('Complete o look', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Adicionar uma parte de baixo', exact: true }).click();
  await addPiece(page, 'Minha primeira calça', false);
  await expect(page.getByText('Combine suas peças', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar look', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Usei este outfit', exact: true })).toBeVisible();
  let db = await snapshot(page);
  expect(db.items.map((i: { category: string }) => i.category).sort()).toEqual([
    'calca',
    'camiseta',
  ]);
  expect(
    db.items.find((i: { name: string }) => i.name === 'Minha primeira camiseta').photo_path,
  ).toBeTruthy();
  expect(db.outfits).toHaveLength(1);
  expect(db.wear).toHaveLength(0);
  await page.goto(`${origin}/discover`);
  await expect(page.getByText('Look salvo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar look', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Usei este outfit', exact: true })).toBeVisible();
  expect((await snapshot(page)).outfits).toHaveLength(1);
  await page.getByRole('button', { name: 'Usei este outfit', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar uso', exact: true }).click();
  await expect(
    page.getByText('Uso registrado. Seu histórico foi atualizado.', { exact: true }),
  ).toBeVisible();
  await page.goto(`${origin}/account`);
  await page.getByRole('button', { name: 'Sair da minha conta', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.reload();
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Entrar no meu closet', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await expect(page.getByText('SEU PRÓXIMO PASSO', { exact: true })).toHaveCount(0);
  db = await snapshot(page);
  expect(db.items).toHaveLength(2);
  expect(db.outfits).toHaveLength(1);
  expect(db.wear).toHaveLength(1);
  expect(errors).toEqual([]);
});
test('an inspiration can be the first saved record without creating owned clothes', async ({
  page,
}) => {
  await start(page);
  await page.getByRole('button', { name: 'Salvar inspiração', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nome da inspiração', exact: true })
    .fill('Domingo de sol');
  await page
    .getByRole('textbox', { name: 'O que você gostou nesse look?', exact: true })
    .fill('Cores claras e um jeito leve de combinar.');
  await page.getByRole('button', { name: 'Adicionar peça à receita', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar inspiração', exact: true }).click();
  await expect(page.getByText('Inspiração salva.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Remix de Domingo de sol', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao início', exact: true }).click();
  await page.reload();
  await expect(page.getByText('1 inspiração salva', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Abrir minha biblioteca de inspirações', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Remix de Domingo de sol', exact: true }),
  ).toBeVisible();
  const db = await snapshot(page);
  expect(db.evolution.recipes).toHaveLength(1);
  expect(db.items).toHaveLength(0);
  expect(db.outfits).toHaveLength(0);
  expect(db.wear).toHaveLength(0);
});
test('first-use and daily look fit narrow screens and reduced motion keeps artwork still', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await start(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/31-primeiro-acesso-320.png', fullPage: true });
  await start(page, false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const artwork = page.getByTestId('look-reveal');
  await expect(artwork).toBeVisible();
  await expect(page.getByTestId('look-light-pass')).toHaveCount(0);
  const image = artwork.locator('img').first();
  await expect
    .poll(() =>
      image.evaluate(
        (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
  for (const kind of ['Criativo', 'Redescoberta', 'Seguro']) {
    await page.getByRole('button', { name: kind, exact: true }).click();
    expect(
      await artwork
        .locator(':scope > div')
        .first()
        .evaluate((el) => getComputedStyle(el).transform),
    ).toBe('matrix(1, 0, 0, 1, 0, 0)');
    expect(await image.evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/32-hoje-320.png', fullPage: true });
  await page.getByRole('button', { name: 'Guardar look', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/34-look-detalhe-320.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/33-hoje-390.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Criativo', exact: true }).click();
  await expect
    .poll(
      () =>
        artwork
          .locator(':scope > div')
          .first()
          .evaluate((el) => getComputedStyle(el).transform),
      { intervals: [16] },
    )
    .not.toBe('matrix(1, 0, 0, 1, 0, 0)');
  await expect
    .poll(() =>
      artwork
        .locator(':scope > div')
        .first()
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .toBe('matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.getByTestId('look-light-pass')).toHaveCSS('opacity', '0');
  expect(await image.evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
});
