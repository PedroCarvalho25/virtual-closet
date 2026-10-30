import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4230';
async function start(page: Page) {
  const html = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  expect(
    (
      await page.request.post(`${origin}/__reset`, {
        headers: { 'X-Closet-Nonce': nonce! },
        data: { empty: true, socialFriends: true },
      })
    ).ok(),
  ).toBe(true);
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.', exact: true })).toBeVisible();
}
test('bundled Acervo thumbnail, full image, double tap, private note and download', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  const results = page.waitForResponse(
    (r) =>
      r.url().endsWith('/preview/v1/social') &&
      !!r.request().postData()?.includes('Botas e chevron'),
  );
  await page.getByLabel('Buscar no mural', { exact: true }).fill('Botas e chevron');
  await results;
  const card = page.getByRole('button', { name: 'Abrir publicação: Botas e chevron', exact: true });
  await expect(card).toBeVisible();
  await expect
    .poll(() => card.locator('img').evaluate((e: HTMLImageElement) => e.naturalWidth))
    .toBeGreaterThan(0);
  await card.dblclick({ delay: 90 });
  await expect(
    page.getByRole('button', { name: 'Descurtir: Botas e chevron', exact: true }),
  ).toBeVisible();
  await card.dblclick({ delay: 90 });
  await expect(
    page.getByRole('button', { name: 'Descurtir: Botas e chevron', exact: true }),
  ).toBeVisible();
  await card.click();
  await expect(page.getByRole('heading', { name: 'Botas e chevron', exact: true })).toBeVisible();
  const full = page
    .getByLabel('Foto com zoom; dois toques para curtir, controles para ampliar')
    .locator('img');
  await expect
    .poll(() => full.evaluate((e: HTMLImageElement) => e.naturalWidth))
    .toBeGreaterThan(1500);
  await page.getByRole('button', { name: 'Descurtir', exact: true }).click();
  await page.getByLabel('Foto com zoom; dois toques para curtir, controles para ampliar').dblclick({ delay: 90 });
  await expect(page.getByRole('button', { name: 'Descurtir', exact: true })).toBeVisible();
  await page
    .getByLabel('Minha ideia para esta referência', { exact: true })
    .fill('Testar esta sobreposição com meu tricô.');
  await page.getByRole('button', { name: 'Guardar ideia', exact: true }).click();
  await expect(page.getByText('Ideia guardada só para você.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Minha ideia para esta referência', { exact: true })).toHaveValue(
    'Testar esta sobreposição com meu tricô.',
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Salvar imagem no dispositivo', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/virtual-closet.*jpg/);
  expect(errors).toEqual([]);
});
test('settings persist, dark surfaces render, banner uploads and privacy saves', async ({
  page,
}) => {
  await start(page);
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('button', { name: 'Escuro', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduzir movimento', exact: true }).click();
  await page.getByRole('switch', { name: 'Modo contemplação', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Escuro', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('switch', { name: 'Modo contemplação', exact: true })).toBeChecked();
  const title = page.getByRole('heading', { name: 'Seu espaço. Seu ritmo.', exact: true });
  await expect(title).toHaveCSS('color', 'rgb(245, 237, 217)');
  await page.screenshot({ path: 'docs/screenshots/60-settings-dark.png' });
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher imagem do banner', exact: true }).click();
  await (await picker).setFiles(path.resolve('docs/preview-assets/tee.jpg'));
  await page.getByRole('button', { name: 'Salvar banner', exact: true }).click();
  await expect(page.getByText('Banner atualizado.', { exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Conta privada', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Conta privada', exact: true })).toBeChecked();
  await page.goto(`${origin}/account`);
  await expect
    .poll(() =>
      page
        .getByRole('img', { name: 'Banner do perfil', exact: true })
        .evaluate((e: HTMLImageElement) => e.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByText('Perfil oculto', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/61-profile-dark-banner.png' });
});
test('continuous mural appends distinct photographs and respects manual paging', async ({
  page,
}) => {
  await start(page);
  const ids = new Set<string>();
  page.on('response', async (r) => {
    if (r.url().endsWith('/preview/v1/social')) {
      const data = await r.json().catch(() => null);
      for (const p of data?.items || []) ids.add(p.id);
    }
  });
  await page.goto(`${origin}/mural`);
  for (let i = 0; i < 8; i++) {
    const cards = page.getByRole('button', { name: /Abrir publicação:/ });
    await cards.last().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 1400);
    await expect(cards.first()).toBeAttached();
  }
  await expect.poll(() => ids.size).toBeGreaterThan(24);
  await expect
    .poll(() =>
      page
        .locator('img')
        .evaluateAll((images) =>
          images
            .filter(
              (image) =>
                image.getBoundingClientRect().top < innerHeight &&
                image.getBoundingClientRect().bottom > 0,
            )
            .every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: 'docs/screenshots/62-mural-photographs.png' });
  await page.goto(`${origin}/settings`);
  await page.getByRole('switch', { name: 'Rolagem contínua', exact: true }).click();
  await page.goto(`${origin}/mural?search=unused`);
  // A reload resets the feed to page one while retaining the device preference.
  await page.reload();
  const more = page.getByRole('button', { name: 'Carregar mais fotos', exact: true });
  await more.scrollIntoViewIfNeeded();
  await expect(more).toBeVisible();
  await more.click();
});
