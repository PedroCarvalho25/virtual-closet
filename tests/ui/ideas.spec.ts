import { test, expect, type Page } from '@playwright/test';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4175';
async function snapshot(page: Page) {
  return (await page.request.get(`${origin}/__fixture/preview/v1/studio`)).json();
}
test.beforeEach(async ({ page }) => {
  const document = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = document.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  await page.request.post(`${origin}/__reset`, { headers: { 'X-Closet-Nonce': nonce! }, data: {} });
});
test('style suggestion responds to weather and saves a real combination in the preview', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajustar meu dia', exact: true }).click();
  await page.getByRole('button', { name: 'Frio', exact: true }).click();
  await page.getByRole('button', { name: 'Trabalho', exact: true }).click();
  await expect(page.getByText('4 peças', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Frio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Trabalho', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Guardar look' }).click();
  await expect(page.getByRole('heading', { name: 'Trabalho · frio', exact: true })).toBeVisible();
  const db = await snapshot(page);
  const saved = db.outfits.find((o: { name: string }) => o.name === 'Trabalho · frio');
  expect(saved.items.map((i: { category: string }) => i.category).sort()).toEqual([
    'calca',
    'camisa',
    'outro',
    'tenis',
  ]);
  expect(errors).toEqual([]);
});
test('broad filters, favorites and editable values work and distinguish missing from free', async ({
  page,
}) => {
  await page.goto(`${origin}/preview-app?start=wardrobe`);
  await page.getByRole('button', { name: 'Acessórios', exact: true }).click();
  await expect(page.getByRole('button', { name: /Boné de fim de semana, Branco/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Camiseta essencial, Branco/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tudo', exact: true }).click();
  const tee = page.getByRole('button', { name: /Camiseta essencial, Branco/ });
  await tee.getByRole('button', { name: 'Favoritar peça', exact: true }).click();
  await expect(tee.getByRole('button', { name: 'Desfavoritar peça', exact: true })).toBeVisible();
  await page.goto(`${origin}/insights?view=values`);
  await expect(page.getByRole('heading', { name: 'Quanto Custa o Outfit?!' })).toBeVisible();
  await page
    .getByRole('button', { name: 'Editar preço de Camiseta essencial', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Preço de Camiseta essencial em reais' }).fill('99,99');
  await page.getByRole('button', { name: 'Salvar preço', exact: true }).click();
  await expect(page.getByText('Preço atualizado na prévia.')).toBeVisible();
  const db = await snapshot(page);
  expect(db.prices[db.items[0].id]).toBe(9999);
  expect(db.favorite_items).toContain(db.items[0].id);
  await page
    .getByRole('button', { name: 'Editar preço de Camiseta essencial', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Preço de Camiseta essencial em reais' }).fill('');
  await page.getByRole('button', { name: 'Salvar preço', exact: true }).click();
  await expect(page.getByText('Subtotal conhecido', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Subtotal conhecido', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('future travel plans can be created, edited and removed without affecting wear history', async ({
  page,
}) => {
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
  const before = await snapshot(page);
  await page.goto(`${origin}/calendar?view=plans`);
  await page.getByRole('button', { name: 'Novo evento ou look planejado' }).click();
  await page.getByRole('textbox', { name: 'Nome do evento *', exact: true }).fill('Viagem reunião');
  await page.getByRole('button', { name: 'Viagem', exact: true }).click();
  await page.getByRole('textbox', { name: 'Data inicial *', exact: true }).fill('25/12/2027');
  await page.getByRole('textbox', { name: 'Data final *', exact: true }).fill('27/12/2027');
  await page.getByRole('button', { name: 'Planejar Domingo sem pressa', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar peças avulsas' }).click();
  await page.getByRole('checkbox', { name: 'Levar Boné de fim de semana' }).click();
  await page.getByRole('switch', { name: 'Lembrete na véspera e no dia' }).click();
  await page.getByRole('button', { name: 'Salvar plano', exact: true }).click();
  await expect(page.getByText('Viagem reunião', { exact: true })).toBeVisible();
  let db = await snapshot(page);
  expect(db.wear.length).toBe(before.wear.length);
  const saved = db.plans.find((p: { title: string }) => p.title === 'Viagem reunião');
  expect(saved.reminder).toBe(true);
  expect(saved.item_ids).toHaveLength(1);
  await page.getByRole('button', { name: 'Editar Viagem reunião', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nome do evento *', exact: true })
    .fill('Viagem revisada');
  await page.getByRole('button', { name: 'Salvar plano', exact: true }).click();
  await expect(page.getByText('Viagem revisada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover Viagem revisada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Plano removido. O histórico de uso foi preservado.')).toBeVisible();
  db = await snapshot(page);
  expect(db.plans.some((p: { id: string }) => p.id === saved.id)).toBe(false);
  expect(db.wear.length).toBe(before.wear.length);
});

test('touch feedback animates normally and respects reduced motion', async ({ page }) => {
  await page.goto(`${origin}/preview-app`);
  await page.getByRole('button', { name: 'Ajustar meu dia', exact: true }).click();
  const button = page.getByRole('button', { name: 'Calor', exact: true });
  await expect(button).toBeVisible();
  const initial = await button.evaluate((element) => getComputedStyle(element).transform);
  const box = await button.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect
    .poll(() => button.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe(initial);
  await page.mouse.up();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('button', { name: 'Ajustar meu dia', exact: true }).click();
  const reduced = page.getByRole('button', { name: 'Frio', exact: true });
  await expect(reduced).toBeVisible();
  const before = await reduced.evaluate((element) => getComputedStyle(element).transform);
  const reducedBox = await reduced.boundingBox();
  await page.mouse.move(
    reducedBox!.x + reducedBox!.width / 2,
    reducedBox!.y + reducedBox!.height / 2,
  );
  await page.mouse.down();
  // Longer than the press feedback duration: this checks the reduced-motion behavior.
  await page.waitForTimeout(150);
  expect(await reduced.evaluate((element) => getComputedStyle(element).transform)).toBe(before);
  await page.mouse.up();
  await expect(reduced).toHaveAttribute('aria-pressed', 'true');
});
