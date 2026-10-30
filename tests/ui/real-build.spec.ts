import { test, expect } from '@playwright/test';
const origin = process.env.VIRTUAL_CLOSET_REAL_ORIGIN;
test('real export opens signup without preview data or fixture requests', async ({ page }) => {
  test.skip(!origin, 'Requires an explicitly selected connected local export.');
  const marker = await (await page.request.get(`${origin}/__build.json`)).json();
  expect(marker.app).toBe('virtual-closet');
  expect(marker.mode).toBe('real');
  const errors: string[] = [];
  const fixtureRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('closet-test.supabase.co')) fixtureRequests.push('fixture request');
  });
  await page.goto(`${origin}/login`);
  await page.getByRole('button', { name: 'Primeira vez? Criar conta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Criar minha conta', exact: true })).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
  await expect(page.getByText('Prévia com dados de exemplo', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/35-cadastro-conectado.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(fixtureRequests).toEqual([]);
});
