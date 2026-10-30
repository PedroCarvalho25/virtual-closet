import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4235';
async function start(page: Page) {
  const html = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  await page.request.post(`${origin}/__reset`, {
    headers: { 'X-Closet-Nonce': nonce! },
    data: { showcase: true, socialFriends: true },
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.', exact: true })).toBeVisible();
}
test('mural wish keeps its source, suggests owned clothes and saves a private composition', async ({
  page,
}) => {
  await start(page);
  const filtered = page.waitForResponse(
    (r) =>
      r.url().includes('/preview/v1/social') &&
      r.request().postData()?.includes('Botas e chevron') === true,
  );
  await page.getByLabel('Buscar no mural', { exact: true }).fill('Botas e chevron');
  await filtered;
  await page
    .getByRole('button', { name: 'Abrir publicação: Botas e chevron', exact: true })
    .click();
  await page.getByRole('button', { name: 'Combinar com meu closet', exact: true }).click();
  await page
    .getByLabel('Qual peça chamou sua atenção?', { exact: true })
    .fill('Camisa do meu próximo look');
  await page.getByRole('button', { name: /^Tipo de peça:/ }).click();
  await page.getByRole('button', { name: 'Camisas', exact: true }).click();
  await page.getByRole('button', { name: 'Modelagem, textura e ocasião', exact: true }).click();
  await page.getByRole('button', { name: 'Ampla', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar desejo', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Camisa do meu próximo look', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Voltar à referência no Mural', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Experimentar ideia 1', exact: true }).click();
  await expect(page.getByLabel('Nome da composição', { exact: true })).toHaveValue(
    'Camisa do meu próximo look',
  );
  await page.getByRole('button', { name: 'Salvar rascunho na minha conta', exact: true }).click();
  await expect(page.getByText('Rascunho salvo na sua conta.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome da composição', { exact: true })).toHaveValue(
    'Camisa do meu próximo look',
  );
  await page.getByRole('button', { name: 'Salvar minhas peças como look', exact: true }).click();
  await expect(
    page.getByText('Look salvo. A composição está preservada e você pode criar outra versão.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/80-desejo-no-atelie.png' });
});
test('wish photo upload, optional fields and comparison work in a narrow screen', async ({
  page,
}) => {
  await start(page);
  await page.setViewportSize({ width: 320, height: 780 });
  await page.getByRole('button', { name: 'Desejos', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar um desejo', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher uma foto', exact: true }).click();
  await (await chooser).setFiles(path.resolve('assets/mural/street-full.jpg'));
  await page.getByLabel('Qual peça chamou sua atenção?', { exact: true }).fill('Meu achado azul');
  await page.getByLabel('Cor', { exact: true }).fill('Azul');
  await page.getByRole('button', { name: 'Preço, link e uma nota', exact: true }).click();
  await page.getByLabel('Preço em reais · opcional', { exact: true }).fill('150');
  await page.getByRole('button', { name: 'Guardar desejo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu achado azul', exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('img', { name: 'Meu achado azul', exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ver todos os desejos', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await expect(page.getByText('Qual faz mais sentido agora?', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/81-desejos-320.png' });
});
test('failed save keeps the wish draft and offers a retry', async ({ page, context }) => {
  await start(page);
  await page.goto(`${origin}/wish/new`);
  await page
    .getByLabel('Qual peça chamou sua atenção?', { exact: true })
    .fill('Quero guardar esta ideia');
  await context.route('**/__fixture/preview/v1/studio', async (route) => {
    if (route.request().method() === 'POST')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Sem conexão neste teste.' }),
      });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Guardar desejo', exact: true }).click();
  await expect(page.getByText('Sem conexão neste teste.').first()).toBeVisible();
  await expect(page.getByLabel('Qual peça chamou sua atenção?', { exact: true })).toHaveValue(
    'Quero guardar esta ideia',
  );
  await context.unroute('**/__fixture/preview/v1/studio');
  await page.getByRole('button', { name: 'Guardar desejo', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Quero guardar esta ideia', exact: true }),
  ).toBeVisible();
});
