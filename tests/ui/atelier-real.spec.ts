import { expect, test } from '@playwright/test';
const origin = process.env.VIRTUAL_CLOSET_REAL_ORIGIN;
test('real build installs only a static shell and opens offline without exposing account data', async ({
  page,
  context,
}) => {
  test.skip(!origin, 'Requires the connected local export.');
  await page.goto(`${origin}/login`);
  await expect(
    page.getByRole('button', { name: 'Primeira vez? Criar conta', exact: true }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (n) => (await (await caches.open(n)).keys()).map((r) => r.url)),
      )
    ).flat();
  });
  expect(cached.some((url) => url.endsWith('/index.html'))).toBe(true);
  expect(cached.every((url) => !url.includes('supabase.co') && !url.includes('/storage/'))).toBe(
    true,
  );
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Primeira vez? Criar conta', exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
test('recovery validates the form and never creates a new account', async ({ page }) => {
  test.skip(!origin, 'Requires the connected local export.');
  let otpRequests = 0;
  let createsUser: unknown;
  await page.route('**/auth/v1/**', async (route) => {
    if (route.request().url().includes('/otp')) {
      otpRequests++;
      createsUser = route.request().postDataJSON().create_user;
      await route.fulfill({ json: {} });
    } else
      await route.fulfill({
        status: 400,
        json: { message: 'Validation test: authentication not executed' },
      });
  });
  await page.goto(`${origin}/recover`);
  await page
    .getByRole('textbox', { name: 'E-mail da conta', exact: true })
    .fill('recovery-test@example.com');
  await page
    .getByRole('button', { name: 'Enviar código para recuperar acesso', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Salvar nova senha e entrar', exact: true }),
  ).toBeVisible();
  expect(otpRequests).toBe(1);
  expect(createsUser).toBe(false);
  await page.getByRole('button', { name: 'Salvar nova senha e entrar', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Código recebido por e-mail', exact: true }),
  ).toBeVisible();
  expect(otpRequests).toBe(1);
});
