import { test, expect } from '@playwright/test';

const origin = process.env.VIRTUAL_CLOSET_REAL_ORIGIN;

test('signup explains rejected email delivery and preserves the form without leaking provider details', async ({
  page,
}) => {
  test.skip(!origin, 'Requires an explicitly selected connected local export.');
  let submissions = 0;
  // Both remote operations are intercepted. No hosted account or email is created.
  await page.route('**/rest/v1/rpc/profile_username_available', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'true' }),
  );
  await page.route('**/auth/v1/signup', (route) => {
    submissions++;
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      headers: {
        'X-Supabase-Api-Version': '2024-01-01',
        'Access-Control-Expose-Headers': 'X-Supabase-Api-Version',
      },
      body: JSON.stringify({
        code: 'unexpected_failure',
        msg: 'Error sending confirmation email: private provider diagnostic',
      }),
    });
  });
  await page.goto(`${origin}/login`);
  await page.getByRole('button', { name: 'Primeira vez? Criar conta', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Teste');
  await page.getByRole('textbox', { name: 'Sobrenome', exact: true }).fill('Cadastro');
  await page.getByRole('textbox', { name: 'Nome de usuário', exact: true }).fill('teste.cadastro');
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('delivery-fixture@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('Valid-pass1!');
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await expect(
    page.getByText(
      'Não conseguimos enviar o código por e-mail. Aguarde alguns minutos e tente novamente.',
      { exact: true },
    ),
  ).toBeVisible();
  expect(submissions).toBe(1);
  await expect(page.getByText(/private provider diagnostic/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail.' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue(
    'delivery-fixture@example.com',
  );
  await expect(page.getByRole('textbox', { name: 'Nome de usuário', exact: true })).toHaveValue(
    'teste.cadastro',
  );
  await expect(page.getByRole('button', { name: 'Criar minha conta', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'docs/screenshots/45-envio-indisponivel.png', fullPage: true });
});
