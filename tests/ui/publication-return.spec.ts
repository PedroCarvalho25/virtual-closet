import { expect, test, type Page } from '@playwright/test';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4235';
const photoLabel = 'Foto com zoom; dois toques para curtir, controles para ampliar';
async function openReference(page: Page, title = 'Botas e chevron') {
  const html = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)![1]!;
  await page.request.post(`${origin}/__reset`, {
    headers: { 'X-Closet-Nonce': nonce },
    data: { empty: true, socialFriends: true },
  });
  await page.goto(`${origin}/preview-app`);
  const filtered = page.waitForResponse(
    (r) =>
      r.url().endsWith('/preview/v1/social') && r.request().postData()?.includes(title) === true,
  );
  await page.getByLabel('Buscar no mural', { exact: true }).fill(title);
  await filtered;
  await page.getByRole('button', { name: `Abrir publicação: ${title}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}
async function visibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}
test('return from photo source keeps one photo, working actions and an unsaved note', async ({
  page,
  context,
}) => {
  await openReference(page, 'Meias que fazem diferença');
  const address = page.url();
  const draft = page.getByLabel('Minha ideia para esta referência', { exact: true });
  await draft.fill('Ideia ainda não salva antes de visitar a fonte.');
  await context.route('https://commons.wikimedia.org/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Fonte da fotografia</h1>' }),
  );
  for (let i = 0; i < 3; i++) {
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Ver fonte da imagem', exact: true }).click();
    const source = await popupPromise;
    await source.waitForLoadState();
    expect(source.url()).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    await visibility(page, 'hidden');
    // Another session can change attribution while the source tab is open.
    const changed = await page.request.post(`${origin}/__fixture/preview/v1/social`, {
      data: {
        name: 'social_action',
        args: {
          p_action: {
            action: 'repost',
            id: new URL(address).pathname.split('/').pop(),
            active: i % 2 === 0,
          },
        },
      },
    });
    expect(changed.ok()).toBe(true);
    const refreshed = page.waitForResponse(
      (r) =>
        r.url().endsWith('/preview/v1/social') &&
        r.request().postData()?.includes('detail') === true,
    );
    await source.close();
    await page.bringToFront();
    await visibility(page, 'visible');
    await refreshed;
    await expect(page).toHaveURL(address);
    await expect(page.getByLabel(photoLabel, { exact: true })).toHaveCount(1);
    await expect(draft).toHaveCount(1);
    await expect(draft).toHaveValue('Ideia ainda não salva antes de visitar a fonte.');
    await expect(
      page.getByRole('button', { name: 'Ver fonte da imagem', exact: true }),
    ).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Ampliar imagem', exact: true }).click();
  await expect(page.getByText('150%', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Restaurar tamanho da imagem', exact: true }).click();
  await page.getByRole('button', { name: 'Curtir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Descurtir', exact: true })).toBeVisible();
});

test('repost attribution appearing and disappearing does not duplicate the photo', async ({
  page,
}) => {
  await openReference(page, 'Meias que fazem diferença');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Republicar', exact: true }).click();
    await expect(page.getByText('Você republicou', { exact: true })).toBeVisible();
    await expect(page.getByLabel(photoLabel, { exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Desfazer republicação', exact: true }).click();
    await expect(page.getByText('Você republicou', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel(photoLabel, { exact: true })).toHaveCount(1);
  }
  await page
    .getByRole('button', { name: 'Sobre minha foto', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/66-publicacao-corrigida.png' });
});

test('connection recovery never accumulates photos and leaves the publication usable', async ({
  page,
  context,
}) => {
  await openReference(page);
  for (let i = 0; i < 3; i++) {
    await context.setOffline(true);
    await expect(page.getByText('Publicação indisponível', { exact: true })).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByRole('heading', { name: 'Botas e chevron', exact: true })).toBeVisible();
    await expect(page.getByLabel(photoLabel, { exact: true })).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: 'Ver fonte da imagem', exact: true }),
    ).toHaveCount(1);
  }
});

test('a failed full-size image offers retry and recovers when the file is available', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/*archive-61848072-full*', (route) =>
    fail ? route.abort('failed') : route.continue(),
  );
  await openReference(page, 'Meias que fazem diferença');
  const retry = page.getByRole('button', { name: 'Recarregar foto', exact: true });
  await expect(retry).toBeVisible();
  fail = false;
  await retry.click();
  const image = page.getByLabel(photoLabel, { exact: true }).locator('img');
  await expect
    .poll(() => image.evaluate((e: HTMLImageElement) => e.naturalWidth))
    .toBeGreaterThan(1500);
  await expect(retry).toHaveCount(0);
});

test('source opening failure is recoverable and does not break the publication', async ({
  page,
}) => {
  await openReference(page);
  await page.evaluate(() => {
    window.open = () => {
      throw new Error('Test: external window unavailable');
    };
  });
  await page.getByRole('button', { name: 'Ver fonte da imagem', exact: true }).click();
  await expect(page.getByText('Não foi possível abrir a fonte.', { exact: true })).toBeVisible();
  await expect(page.getByLabel(photoLabel, { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Curtir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Descurtir', exact: true })).toBeVisible();
});
