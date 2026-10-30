import { test, expect, type Page } from '@playwright/test';
const origin = process.env.VIRTUAL_CLOSET_STATIC_ORIGIN || 'http://127.0.0.1:4174';
const passwordHint = '8+ caracteres: maiúscula, minúscula, número e símbolo.';

async function signupForm(page: Page) {
  await page.goto(`${origin}/login`);
  await page.getByRole('button', { name: 'Primeira vez? Criar conta', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Pedro');
  await page.getByRole('textbox', { name: 'Sobrenome', exact: true }).fill('Silva');
  await page.getByRole('textbox', { name: 'Nome de usuário', exact: true }).fill('pedro.silva');
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('teste@example.com');
}

function verifySignup(width: number) {
  return async ({ page }: { page: Page }) => {
    let submissions = 0;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Isolated local fixture only: no account is created in a hosted project.
    await page.route('https://closet-test.supabase.co/**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
        });
        return;
      }
      if (new URL(route.request().url()).pathname === '/preview/v1/identity') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
        return;
      }
      if (new URL(route.request().url()).pathname === '/auth/v1/signup') {
        submissions++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            aud: 'authenticated',
            email: 'teste@example.com',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          }),
        });
        return;
      }
      await route.abort();
    });
    await page.setViewportSize({ width, height: 844 });
    await signupForm(page);
    const password = page.getByLabel('Senha', { exact: true });
    const hint = page.getByText(passwordHint, { exact: true });
    await expect(hint).toHaveCount(0);
    await password.fill('curta');
    await password.blur();
    await expect(hint).toHaveCount(0);
    await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
    await expect(hint).toBeVisible();
    await expect(hint).toHaveCount(1);
    await expect(hint).toHaveAttribute('role', 'alert');
    await expect(hint).toHaveCSS('color', 'rgb(179, 58, 50)');
    await expect(hint).toHaveCSS('font-size', '10px');
    expect((await hint.boundingBox())!.height).toBeLessThanOrEqual(17);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(submissions).toBe(0);
    await page.screenshot({ path: `docs/screenshots/44-senha-${width}.png`, fullPage: true });
    // Length alone is insufficient; editing an invalid password keeps the useful hint.
    await password.fill('test-password');
    await expect(hint).toBeVisible();
    await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Criar minha conta', exact: true }),
    ).toBeEnabled();
    expect(submissions).toBe(0);
    await password.fill('Test-password1!');
    await expect(hint).toHaveCount(0);
    await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Confirme seu e-mail.' })).toBeVisible();
    await expect(page.getByLabel('Código de 6 dígitos')).toBeVisible();
    expect(submissions).toBe(1);
    await page.getByRole('button', { name: 'Voltar ao acesso', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue(
      'teste@example.com',
    );
    await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
    expect(errors).toEqual([]);
  };
}

test(
  'signup shows one small red password hint only after an invalid attempt at 320px',
  verifySignup(320),
);
test(
  'signup shows one small red password hint only after an invalid attempt at 390px',
  verifySignup(390),
);

test('signup handles a server weak_password response inline and resets feedback on mode change', async ({
  page,
}) => {
  await page.route('https://closet-test.supabase.co/**', async (route) => {
    const signup = new URL(route.request().url()).pathname === '/auth/v1/signup';
    await route.fulfill({
      status: signup ? 422 : 200,
      contentType: 'application/json',
      headers: {
        'X-Supabase-Api-Version': '2024-01-01',
        'Access-Control-Expose-Headers': 'X-Supabase-Api-Version',
      },
      body: signup
        ? JSON.stringify({ code: 'weak_password', msg: 'Password is too weak' })
        : 'true',
    });
  });
  await signupForm(page);
  await page.getByLabel('Senha', { exact: true }).fill('Test-password1!');
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await expect(page.getByText(passwordHint, { exact: true })).toBeVisible();
  await expect(page.getByText(passwordHint, { exact: true })).toHaveCount(1);
  await expect(page.getByText('Password is too weak', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Já tenho uma conta', exact: true }).click();
  await expect(page.getByText(passwordHint, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Primeira vez? Criar conta', exact: true }).click();
  await expect(page.getByText(passwordHint, { exact: true })).toHaveCount(0);
});

test('login submits existing passwords without enforcing signup complexity', async ({ page }) => {
  let submissions = 0;
  await page.route('https://closet-test.supabase.co/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/auth/v1/token') submissions++;
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'invalid_credentials', msg: 'Invalid login credentials' }),
    });
  });
  await page.goto(`${origin}/login`);
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('curta');
  await page.getByRole('button', { name: 'Entrar no meu closet', exact: true }).click();
  await expect(page.getByText('E-mail ou senha incorretos.', { exact: true })).toBeVisible();
  expect(submissions).toBe(1);
  await expect(page.getByText(passwordHint, { exact: true })).toHaveCount(0);
});
