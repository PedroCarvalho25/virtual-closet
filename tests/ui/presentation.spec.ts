import { test, expect } from '@playwright/test';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4175';
test.beforeEach(async ({ page }) => {
  const html = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  await page.request.post(`${origin}/__reset`, {
    headers: { 'X-Closet-Nonce': nonce! },
    data: { showcase: true },
  });
});
test('presentation chapters open working views, preserve state, and reset only on confirmation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${origin}/preview`);
  const frame = page.frameLocator('#closet-app');
  await expect(frame.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight))
    .toBe(true);
  await page.getByRole('button', { name: 'Explore seu espaço' }).click();
  await expect(frame.getByRole('heading', { name: 'Explorar' })).toBeVisible();
  await page.getByRole('button', { name: 'Antes de comprar', exact: false }).click();
  await expect(frame.getByRole('button', { name: 'Comparar duas peças' })).toBeVisible();
  await frame.getByRole('button', { name: 'Comparar duas peças' }).click();
  await expect(frame.getByText('Comparar peças', { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'docs/screenshots/27-apresentacao-terca.png' });
  await page.getByRole('button', { name: 'Recomeçar a prévia' }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(frame.getByText('Comparar peças', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Recomeçar a prévia' }).click();
  await page.getByRole('button', { name: 'Restaurar exemplos' }).click();
  await expect(frame.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('visual library links existing remix history, stories and actual-wear discoveries', async ({
  page,
}) => {
  await page.goto(`${origin}/preview-app?view=inspirations`);
  await expect(page.getByText('Uma possibilidade com peças do seu closet').first()).toBeVisible();
  await page
    .getByRole('button', { name: 'Ver versões de Casual com contraste · 1', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Domingo sem pressa', exact: true })).toBeVisible();
  await page.goto(`${origin}/style?view=stories`);
  await expect(page.getByText('O jeans daquela viagem', { exact: false })).toBeVisible();
  await page.goto(`${origin}/style?view=challenges`);
  await expect(page.getByText('Uma peça, três estilos', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar').first()).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});
test('comparison keeps two different candidates and unknown values distinct from zero', async ({
  page,
}) => {
  await page.goto(`${origin}/preview-app?view=wishlist`);
  await page.getByRole('button', { name: 'Comparar duas peças' }).click();
  await page.getByRole('textbox', { name: 'Usos imaginados para comparar', exact: true }).fill('0');
  await expect(page.getByText('Custo por uso sem estimativa', { exact: true })).toHaveCount(2);
  await page
    .getByRole('textbox', { name: 'Usos imaginados para comparar', exact: true })
    .fill('30');
  await expect(page.getByText('R$ 3,00 por uso hipotético', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Camisa em tom de areia', exact: true }).first().click();
  await expect(
    page.getByRole('button', { name: 'Outra camiseta branca', exact: true }),
  ).toHaveCount(2);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'docs/screenshots/28-comparar-desejos.png' });
});
