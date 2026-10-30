import { test, expect } from '@playwright/test';

const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4175';

test('bold home and profile keep full labels and long usernames within narrow and wide layouts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const html = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = html.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  expect(
    (
      await page.request.post(`${origin}/__reset`, {
        headers: { 'X-Closet-Nonce': nonce! },
        data: { empty: true },
      })
    ).ok(),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${origin}/preview-app`);
  for (const width of [320, 390, 640]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('heading', { name: 'Seu closet.', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Seu closet.', exact: true })).toHaveCSS(
      'font-family',
      'DMSans_800ExtraBold',
    );
    for (const name of ['Montar look', 'Salvar inspiração', 'Minha conta']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      expect(
        await button.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true);
      const rect = await button.boundingBox();
      expect(rect!.width).toBeGreaterThanOrEqual(44);
      expect(rect!.height).toBeGreaterThanOrEqual(44);
    }
    for (const title of ['Montar look', 'Salvar inspiração']) {
      expect(
        await page
          .getByText(title, { exact: true })
          .evaluate(
            (element) =>
              element.getBoundingClientRect().height <=
              parseFloat(getComputedStyle(element).lineHeight) * 2 + 1,
          ),
      ).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `docs/screenshots/47-inicio-${width}.png`, fullPage: true });
  }
  // The preview service worker owns network requests; override its response at
  // the fetch boundary to exercise an extreme valid handle without real writes.
  const username = 'm'.repeat(24);
  await page.evaluate((handle) => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (
        url.hostname === 'closet-test.supabase.co' &&
        url.pathname === '/preview/v1/identity' &&
        typeof init?.body === 'string' &&
        JSON.parse(init.body).name === 'identity_account' &&
        response.ok
      ) {
        const account = await response.json();
        account.profile.username = handle;
        account.profile.bio = 'Vintage, música e fotografia.';
        return new Response(JSON.stringify(account), {
          status: response.status,
          headers: response.headers,
        });
      }
      return response;
    };
  }, username);
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click();
  await expect(page.getByRole('heading', { name: `@${username}`, exact: true })).toBeVisible();
  for (const width of [320, 390, 640]) {
    await page.setViewportSize({ width, height: 844 });
    const handle = page.getByRole('heading', { name: `@${username}`, exact: true });
    expect(await handle.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByText('ESTILO EM MOVIMENTO', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText('Pequenas escolhas. Um jeito só seu.', { exact: true }),
    ).toHaveCount(0);
    await page.screenshot({ path: `docs/screenshots/48-perfil-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});
