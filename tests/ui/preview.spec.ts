import { test, expect } from '@playwright/test';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4175';
test.beforeEach(async ({ request }) => {
  const html = await (await request.get(`${origin}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  const reset = await request.post(`${origin}/__reset`, {
    headers: { 'X-Closet-Nonce': nonce! },
    data: {},
  });
  expect(reset.ok()).toBe(true);
});

test('photo preview filters pieces and lays out all collage images within their card', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/preview-app?start=wardrobe`);
  await expect(page.getByRole('heading', { name: 'Meu guarda-roupa' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Camiseta essencial, Branco/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar peças por nome ou cor' }).fill('caramelo');
  await expect(page.getByRole('button', { name: /Tênis caramelo, Caramelo/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Camiseta essencial, Branco/ })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Buscar peças por nome ou cor' }).fill('');
  await page.getByRole('button', { name: 'Filtros do guarda-roupa' }).click();
  await expect(page.getByRole('switch', { name: 'Mostrar arquivadas' })).toBeVisible();
  await page.getByRole('tab', { name: 'Minhas combinações', exact: true }).click();
  const card = page.getByRole('button', { name: 'Domingo sem pressa', exact: true });
  await expect(card).toBeVisible();
  await expect
    .poll(() =>
      card
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  const dimensions = await card.evaluate((element) => {
    const outer = element.getBoundingClientRect();
    return [...element.querySelectorAll('img')].map((image) => {
      const r = image.getBoundingClientRect();
      return {
        inside:
          r.left >= outer.left &&
          r.right <= outer.right + 1 &&
          r.top >= outer.top &&
          r.bottom <= outer.bottom + 1,
        x: Math.round(r.x),
        width: r.width,
        height: r.height,
      };
    });
  });
  expect(dimensions).toHaveLength(3);
  expect(dimensions.every((r) => r.inside && r.width > 40 && r.height > 40)).toBe(true);
  expect(new Set(dimensions.map((r) => r.x)).size).toBe(2);
  // Verify loaded photographs stay visible after the image transition would have ended.
  await page.waitForTimeout(500);
  expect(
    await card.locator('img').evaluateAll((images) =>
      images.every((image) => {
        let node: Element | null = image;
        while (node) {
          if (Number(getComputedStyle(node).opacity) < 0.99) return false;
          node = node.parentElement;
        }
        return (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0;
      }),
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test('local connection assistant rejects secret keys and cross-origin changes', async ({
  request,
}) => {
  const response = await request.get(`${origin}/connect`);
  const document = await response.text();
  const nonce = document.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  for (const key of ['sb_secret_do_not_accept_this', 'my-database-password']) {
    const result = await request.post(`${origin}/__connect`, {
      headers: { 'X-Closet-Nonce': nonce! },
      data: { url: 'https://my-project.supabase.co', key },
    });
    expect(result.status()).toBe(400);
  }
  const crossOrigin = await request.post(`${origin}/__connect`, {
    headers: { Origin: 'https://example.com', 'X-Closet-Nonce': nonce! },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
  const noNonce = await request.post(`${origin}/__connect`, { data: {} });
  expect(noNonce.status()).toBe(403);
});
