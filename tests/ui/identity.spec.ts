import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4175';
async function reset(page: Page, needsVerification = false) {
  const html = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  expect(
    (
      await page.request.post(`${origin}/__reset`, {
        headers: { 'X-Closet-Nonce': nonce! },
        data: { empty: true, needsVerification },
      })
    ).ok(),
  ).toBe(true);
}
async function login(page: Page) {
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Entrar no meu closet', exact: true }).click();
}
async function logout(page: Page) {
  await page.goto(`${origin}/account`);
  await page.getByRole('button', { name: 'Sair da minha conta', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Entrar no meu closet', exact: true }),
  ).toBeVisible();
}
test('unknown device requires email code; known device survives logout and revoked device requires a new code', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await reset(page, true);
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Confirme este dispositivo' })).toBeVisible();
  await page.getByLabel('Código de 6 dígitos').fill('000000');
  await page.getByRole('button', { name: 'Confirmar este dispositivo', exact: true }).click();
  await expect(
    page.getByText(
      'Esse código expirou ou não está correto. Confira os seis dígitos ou peça outro.',
    ),
  ).toBeVisible();
  await page.getByLabel('Código de 6 dígitos').fill('123456');
  await page.getByRole('button', { name: 'Confirmar este dispositivo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await logout(page);
  await login(page);
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await page.goto(`${origin}/account`);
  await page.getByRole('button', { name: 'Dispositivos reconhecidos', exact: true }).click();
  await page.getByRole('button', { name: /^Esquecer .* atual$/ }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await login(page);
  await expect(page.getByRole('heading', { name: 'Confirme este dispositivo' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('signup keeps names and username through email confirmation and profile creation', async ({
  page,
}) => {
  await reset(page);
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await logout(page);
  await page.getByRole('button', { name: 'Primeira vez? Criar conta', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Pedro');
  await page.getByRole('textbox', { name: 'Sobrenome', exact: true }).fill('Carvalho');
  await page.getByRole('textbox', { name: 'Nome de usuário', exact: true }).fill('pedro.carvalho');
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('Test-password1!');
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail.' })).toBeVisible();
  await page.getByLabel('Código de 6 dígitos').fill('123456');
  await page.getByRole('button', { name: 'Confirmar meu cadastro', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu perfil' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nome', exact: true })).toHaveValue('Pedro');
  await expect(page.getByRole('textbox', { name: 'Nome de usuário', exact: true })).toHaveValue(
    'pedro.carvalho',
  );
  await page.getByRole('button', { name: 'Criar meu perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await page.goto(`${origin}/account`);
  await expect(page.getByRole('heading', { name: '@pedro.carvalho', exact: true })).toBeVisible();
  await expect(page.getByText('Pedro Carvalho', { exact: true })).toBeVisible();
});
test('profile edits and photo persist; share uses a searchable handle and layouts fit narrow screens', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await reset(page);
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await page.goto(`${origin}/account`);
  await page.screenshot({ path: 'docs/screenshots/40-conta-390.png', fullPage: true });
  await page.getByRole('button', { name: 'Editar meu perfil', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Nome de usuário', exact: true }),
  ).not.toBeEditable();
  await page
    .getByRole('textbox', { name: 'Bio · opcional', exact: true })
    .fill('Um toque de cor em cada dia.');
  await page.getByRole('button', { name: 'Coral', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar meu perfil', exact: true }).click();
  await expect(page.getByText('Perfil atualizado.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Um toque de cor em cada dia.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click();
  await page.getByRole('button', { name: 'Editar foto do perfil', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher foto do perfil', exact: true }).click();
  await (await chooser).setFiles(path.resolve('docs/preview-assets/tee.jpg'));
  await page.getByRole('button', { name: 'Salvar foto do perfil', exact: true }).click();
  await expect(page.getByText('Foto atualizada.')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  const homeAvatar = page.getByRole('button', { name: 'Minha conta', exact: true }).locator('img');
  await expect(homeAvatar).toBeVisible();
  await expect
    .poll(() => homeAvatar.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.screenshot({ path: 'docs/screenshots/46-inicio-avatar-390.png', fullPage: true });
  await page.reload();
  await expect(homeAvatar).toBeVisible();
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click();
  const avatar = page
    .getByRole('button', { name: 'Editar foto do perfil', exact: true })
    .locator('img');
  await expect(avatar).toBeVisible();
  await expect
    .poll(() => avatar.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const previousPhoto = await avatar.getAttribute('src');
  await page.getByRole('button', { name: 'Editar foto do perfil', exact: true }).click();
  const replacement = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher foto do perfil', exact: true }).click();
  await (await replacement).setFiles(path.resolve('assets/welcome/knit.jpg'));
  await page.getByRole('button', { name: 'Salvar foto do perfil', exact: true }).click();
  await expect(page.getByText('Foto atualizada.')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(homeAvatar).toBeVisible();
  await expect(homeAvatar).not.toHaveAttribute('src', previousPhoto!);
  await expect
    .poll(() => homeAvatar.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (window as unknown as { shared: ShareData }).shared = data;
      },
    });
  });
  await page.getByRole('button', { name: 'Compartilhar perfil', exact: true }).click();
  const shared = await page.evaluate(() => (window as unknown as { shared: ShareData }).shared);
  expect(shared.text).toContain('@lia.oliveira');
  expect(shared.url).toBeUndefined();
  expect(shared.text).not.toContain('127.0.0.1');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/41-conta-320.png', fullPage: true });
  await page.getByRole('button', { name: 'Editar foto do perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Remover foto do perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Foto removida.')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(homeAvatar).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Minha conta', exact: true })).toContainText('LO');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Minha conta', exact: true })).toContainText('LO');
  expect(errors).toEqual([]);
});
test('connections can be followed, blocked, unblocked and removed with real fixture counts', async ({
  page,
}) => {
  await reset(page);
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await page.goto(`${origin}/people`);
  await page
    .getByRole('textbox', { name: 'Encontrar pelo nome de usuário', exact: true })
    .fill('@marina.ramos');
  await page.getByRole('button', { name: 'Encontrar perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: '@marina.ramos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Seguindo · deixar de seguir', exact: true }).click();
  await page.getByRole('button', { name: 'Seguir @marina.ramos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Seguindo · deixar de seguir', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bloquear @marina.ramos', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('button', { name: 'Desbloquear @marina.ramos', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Você ainda não bloqueou nenhum perfil.')).toBeVisible();
  await page.getByRole('button', { name: 'Seguidores', exact: true }).click();
  await page.getByRole('button', { name: 'Remover seguidor @ian.costa', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.goto(`${origin}/account`);
  await expect(page.getByRole('button', { name: '0 Seguidores', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '0 Seguindo', exact: true })).toBeVisible();
});

test('a shared profile survives login and a separate browser needs its own email confirmation', async ({
  page,
  browser,
}) => {
  await reset(page, true);
  await page.goto(`${origin}/preview-app`);
  await page.getByLabel('Código de 6 dígitos').fill('123456');
  await page.getByRole('button', { name: 'Confirmar este dispositivo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await logout(page);
  await page.goto(`${origin}/u/marina.ramos`);
  await login(page);
  await expect(page.getByRole('heading', { name: '@marina.ramos', exact: true })).toBeVisible();
  const different = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const other = await different.newPage();
    await other.goto(`${origin}/preview-app`);
    await expect(other.getByRole('heading', { name: 'Confirme este dispositivo' })).toBeVisible();
    await expect(other.getByText('@lia.oliveira', { exact: true })).toHaveCount(0);
    await other.screenshot({ path: 'docs/screenshots/42-verificar-aparelho.png', fullPage: true });
  } finally {
    await different.close();
  }
});
