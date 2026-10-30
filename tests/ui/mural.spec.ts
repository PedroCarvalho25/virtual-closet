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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.', exact: true })).toBeVisible();
  await page.getByLabel('Buscar no mural', { exact: true }).scrollIntoViewIfNeeded();
}
for (const width of [320, 390, 640])
  test(`mural layout, search, color and scroll restoration at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 844 });
    await start(page);
    const first = page.getByRole('button', { name: 'Abrir publicação: Cor na rua', exact: true });
    await first.scrollIntoViewIfNeeded();
    await expect(first).toBeVisible();
    await expect(first.locator('img')).toBeVisible();
    const image = first.locator('img');
    await expect
      .poll(() => image.evaluate((e: HTMLImageElement) => e.naturalWidth))
      .toBeGreaterThan(0);
    await page.screenshot({ path: `docs/screenshots/50-mural-${width}.png` });
    const before = (await first.boundingBox())!.y;
    await first.click();
    await expect(page.getByRole('heading', { name: 'Cor na rua', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ampliar imagem', exact: true }).click();
    await expect(page.getByText('150%', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Restaurar tamanho da imagem' }).click();
    await page.screenshot({ path: `docs/screenshots/51-foto-${width}.png` });
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    await expect(first).toBeVisible();
    expect(Math.abs((await first.boundingBox())!.y - before)).toBeLessThan(15);
    const search = page.getByLabel('Buscar no mural', { exact: true });
    await search.fill('tricô');
    await expect(page.getByRole('button', { name: /Abrir publicação:/ }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Cor rosa', exact: true }).click();
    await expect(page.getByText('Ainda não há fotos aqui', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cor rosa', exact: true }).click();
    await search.fill('');
    await expect(page.getByRole('button', { name: /Abrir publicação:/ }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
test('likes, bookmarks, repost attribution, inbox, sending and download persist in demo', async ({
  page,
}) => {
  await start(page);
  await page.getByRole('button', { name: 'Abrir publicação: Cor na rua', exact: true }).click();
  await page.getByRole('button', { name: 'Curtir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Descurtir', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Republicar', exact: true }).click();
  await expect(page.getByText('Você republicou', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover dos salvos', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar no app', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Descurtir', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remover dos salvos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar para amigo', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar para @marina.ramos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Enviado para @marina.ramos', exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Salvar imagem no dispositivo', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/virtual-closet.*jpg/);
  await page.goto(`${origin}/mural-inbox`);
  await expect(page.getByRole('button', { name: /Abrir foto enviada por Marina/ })).toBeVisible();
  await page.getByRole('button', { name: /Abrir foto enviada por Marina/ }).click();
  await expect(page.getByRole('heading', { name: 'Camadas e textura', exact: true })).toBeVisible();
});
test('failed optimistic action rolls back and reports the connection failure', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Abrir publicação: Cor na rua', exact: true }).click();
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      if (
        String(input).endsWith('/preview/v1/social') &&
        typeof init?.body === 'string' &&
        JSON.parse(init.body).args?.p_action?.action === 'like'
      )
        throw new Error('Falha de conexão de teste');
      return original(input, init);
    };
  });
  await page.getByRole('button', { name: 'Curtir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Curtir', exact: true })).toBeVisible();
  await expect(page.getByText(/Falha de conexão de teste|Não foi possível/).first()).toBeVisible();
});
test('explicit photo publication and deletion update account counts without publishing the diary', async ({
  page,
}) => {
  await start(page);
  await page.getByRole('button', { name: 'Publicar foto', exact: true }).click();
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher foto', exact: true }).click();
  await (await picker).setFiles(path.resolve('docs/preview-assets/tee.jpg'));
  await page.getByLabel('Título', { exact: true }).fill('Minha publicação de teste');
  await page.getByLabel('Tags (separadas por vírgula)', { exact: true }).fill('teste, minimalista');
  await page
    .getByRole('button', { name: 'Tenho direito de publicar esta imagem', exact: true })
    .click();
  await page.getByRole('button', { name: 'Publicar no mural', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Minha publicação de teste', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Minha publicação de teste', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir publicação', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu closet.', exact: true })).toBeVisible();
  await page.getByLabel('Buscar no mural', { exact: true }).fill('Minha publicação de teste');
  await expect(page.getByText('Ainda não há fotos aqui', { exact: true })).toBeVisible();
});
