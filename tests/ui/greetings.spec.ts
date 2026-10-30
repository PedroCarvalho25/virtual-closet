import { expect, test } from '@playwright/test';
const preview = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4235';
const real = process.env.VIRTUAL_CLOSET_REAL_ORIGIN || 'http://127.0.0.1:4211';
test('chosen name, article and activation persist privately without changing public identity', async ({
  page,
}) => {
  const html = await (await page.request.get(`${preview}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)![1]!;
  await page.request.post(`${preview}/__reset`, {
    headers: { 'X-Closet-Nonce': nonce },
    data: { empty: true },
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`${preview}/preview-app`);
  await expect(page.getByTestId('home-greeting')).toContainText('Lia');
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  const name = 'Lua d’Água / ☆ 🌈 ' + 'A'.repeat(140);
  const field = page.getByRole('textbox', {
    name: 'Nome pelo qual gostaria de ser chamado',
    exact: true,
  });
  await field.fill(name);
  await expect(field).not.toHaveAttribute('maxlength');
  await page.getByRole('switch', { name: 'Usar esse nome nas saudações', exact: true }).click();
  await page.getByRole('button', { name: 'Feminino', exact: true }).click();
  await expect(page.getByText(`Ora, ora... se não é a ${name}.`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar minhas saudações', exact: true }).click();
  await expect(page.getByText('Suas saudações foram salvas.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(field).toHaveValue(name);
  await expect(
    page.getByRole('switch', { name: 'Usar esse nome nas saudações', exact: true }),
  ).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto(`${preview}/discover`);
  await expect(page.getByTestId('home-greeting')).toContainText(name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/64-saudacao-nome-livre.png' });
  await page.goto(`${preview}/settings`);
  await page.getByRole('switch', { name: 'Usar esse nome nas saudações', exact: true }).click();
  await page.getByRole('button', { name: 'Masculino', exact: true }).click();
  await expect(page.getByText('Ora, ora... se não é o Lia.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar minhas saudações', exact: true }).click();
  await expect(page.getByText('Suas saudações foram salvas.', { exact: true })).toBeVisible();
  await page.goto(`${preview}/discover`);
  await expect(page.getByTestId('home-greeting')).toContainText('Lia');
  await expect(page.getByTestId('home-greeting')).not.toContainText(name);
  await page.goto(`${preview}/account`);
  await expect(page.getByText('Lia Oliveira', { exact: true })).toBeVisible();
});
test('signup stores the optional selection without sending a real signup email', async ({
  page,
}) => {
  let metadata: Record<string, unknown> = {};
  await page.route('**/rest/v1/rpc/profile_username_available', (r) => r.fulfill({ json: true }));
  await page.route('**/auth/v1/**', (r) => {
    if (r.request().url().endsWith('/signup')) {
      metadata = r.request().postDataJSON().data;
      return r.fulfill({
        json: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          aud: 'authenticated',
          email: 'greetings@example.com',
          user_metadata: metadata,
          created_at: new Date().toISOString(),
        },
      });
    }
    return r.fulfill({ status: 400, json: { message: 'Isolated test' } });
  });
  for (const [label, value] of [
    ['Masculino', 'male'],
    ['Feminino', 'female'],
    ['Prefiro não informar', 'unspecified'],
  ]) {
    await page.goto(`${real}/login`);
    await page.getByRole('button', { name: 'Primeira vez? Criar conta', exact: true }).click();
    await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Armando');
    await page.getByRole('textbox', { name: 'Sobrenome', exact: true }).fill('Silva');
    await page.getByRole('textbox', { name: 'Nome de usuário', exact: true }).fill('armando.teste');
    await page.getByRole('button', { name: label!, exact: true }).click();
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('greetings@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('Test-password1!');
    await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Confirme seu e-mail.' })).toBeVisible();
    expect(metadata.closet_greeting).toEqual({
      sex: value,
      preferredName: '',
      usePreferredName: false,
    });
  }
});
