import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
const origin = process.env.VIRTUAL_CLOSET_PREVIEW_ORIGIN || 'http://127.0.0.1:4175';
async function capture(page: Page, file: string) {
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: file, fullPage: true });
}
async function snapshot(page: Page) {
  return (await page.request.get(`${origin}/__fixture/preview/v1/studio`)).json();
}
async function open(page: Page, view: string) {
  await page.goto(`${origin}/style?view=${view}`);
  await expect(page.getByText('Prévia com dados de exemplo', { exact: true })).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  const document = await (await page.request.get(`${origin}/preview`)).text();
  const nonce = document.match(/X-Closet-Nonce['"]?:\s*['"]([^'"]+)/)?.[1];
  expect(nonce).toBeTruthy();
  await page.request.post(`${origin}/__reset`, { headers: { 'X-Closet-Nonce': nonce! }, data: {} });
  await page.goto(`${origin}/preview-app`);
  await expect(page.getByRole('heading', { name: 'Seu closet.' })).toBeVisible();
});
test('unavailable pieces stay out of the three options and the original home', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'closet');
  await page.getByRole('checkbox', { name: 'Escolher Camiseta essencial', exact: true }).click();
  await page.getByRole('button', { name: 'Lavando', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar detalhes da peça', exact: true }).click();
  await expect
    .poll(async () => {
      const s = await snapshot(page);
      return s.evolution.details[s.items[0].id]?.state;
    })
    .toBe('washing');
  await open(page, 'today');
  await expect(page.getByRole('checkbox', { name: 'Trocar Camiseta essencial' })).toHaveCount(0);
  for (const label of ['Criativo', 'Redescoberta']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Trocar Camiseta essencial' })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Guardar esta combinação' }).click();
  await expect(page.getByRole('button', { name: 'Como me senti com este look' })).toBeVisible();
  const s = await snapshot(page);
  expect(s.evolution.decisions[0].itemIds).not.toContain(s.items[0].id);
  expect(errors).toEqual([]);
});
test('inspiration becomes an owned remix with source and no automatic wear', async ({ page }) => {
  const before = await snapshot(page);
  await open(page, 'inspirations');
  await page.getByRole('button', { name: 'Nova inspiração', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nome da inspiração', exact: true })
    .fill('Meu casual de teste');
  await page
    .getByRole('textbox', { name: 'Link da referência · opcional', exact: true })
    .fill('https://example.com/inspiracao');
  await page
    .getByRole('textbox', { name: 'Cor da peça de referência', exact: true })
    .fill('Branco');
  await page.getByRole('button', { name: 'Adicionar peça à receita' }).click();
  await page.getByRole('button', { name: 'Calças', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar peça à receita' }).click();
  await page.getByRole('button', { name: 'Guardar inspiração', exact: true }).click();
  await page.getByRole('button', { name: 'Remix de Meu casual de teste', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardar meu remix' })).toBeEnabled();
  await mkdir('docs/screenshots', { recursive: true });
  await capture(page, 'docs/screenshots/20-remix.png');
  await page.getByRole('button', { name: 'Guardar meu remix' }).click();
  await expect(
    page.getByRole('heading', { name: 'Remix · Meu casual de teste', exact: true }),
  ).toBeVisible();
  const s = await snapshot(page),
    r = s.evolution.recipes.find((r: any) => r.title === 'Meu casual de teste');
  expect(s.evolution.decisions.some((d: any) => d.recipeId === r.id && d.outfitId)).toBe(true);
  expect(s.wear.length).toBe(before.wear.length);
});
test('wishlist analysis and wear feedback persist, with a three-choice daily lab', async ({
  page,
}) => {
  const before = await snapshot(page);
  await open(page, 'wishlist');
  await page.getByRole('button', { name: 'Considerar uma peça' }).click();
  await page
    .getByRole('textbox', { name: 'Peça que estou considerando', exact: true })
    .fill('Outra camiseta branca');
  await page.getByRole('textbox', { name: 'Cor', exact: true }).fill('Branco');
  await page.getByRole('textbox', { name: 'Preço em reais · opcional', exact: true }).fill('89,90');
  await page.getByRole('button', { name: 'Guardar na lista de desejos' }).click();
  await expect(page.getByText('Outra camiseta branca', { exact: true })).toBeVisible();
  let s = await snapshot(page);
  expect(s.evolution.wishes[0].price).toBe(8990);
  expect(s.items.length).toBe(before.items.length);
  await capture(page, 'docs/screenshots/21-antes-de-comprar.png');
  await open(page, 'memory');
  await page
    .getByRole('textbox', { name: 'O que você quer lembrar?', exact: true })
    .fill('Confortável para caminhar.');
  await page.getByRole('button', { name: 'Guardar meu feedback' }).click();
  await expect.poll(async () => (await snapshot(page)).evolution.feedback.length).toBe(1);
  await open(page, 'lab');
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: 'Eu usaria a opção A' }).click();
    await expect(page.getByText(`${i} de 3 escolhas`, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Por hoje, está ótimo.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Eu usaria a opção A' })).toHaveCount(0);
  s = await snapshot(page);
  expect(s.evolution.decisions.filter((d: any) => d.kind === 'lab')).toHaveLength(3);
  expect(s.wear.length).toBe(before.wear.length);
});
test('travel checklist persists and retrospective exports a private-safe card', async ({
  page,
}) => {
  const before = await snapshot(page);
  await open(page, 'travel');
  const checkbox = page.getByRole('checkbox', { name: /Separar/ }).first();
  await checkbox.click();
  await page
    .getByRole('textbox', { name: 'Lavar, passar, buscar…', exact: true })
    .fill('Separar as roupas');
  await page.getByRole('button', { name: 'Adicionar à preparação' }).click();
  await page.getByRole('button', { name: 'Salvar preparação da viagem' }).click();
  await expect
    .poll(async () =>
      Object.values((await snapshot(page)).evolution.planDetails).some((d: any) =>
        d.tasks.includes('Separar as roupas'),
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Concluir: Separar as roupas' })).toBeVisible();
  await capture(page, 'docs/screenshots/22-preparar-viagem.png');
  await open(page, 'wrapped');
  await expect(
    page.getByRole('switch', { name: 'Incluir preços no compartilhamento' }),
  ).not.toBeChecked();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar cartão da retrospectiva' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  expect((await snapshot(page)).wear.length).toBe(before.wear.length);
});
test('private circle poll, vote and recipe remix use sanitized local data', async ({ page }) => {
  await open(page, 'circles');
  await page.getByRole('textbox', { name: 'Seu nome no círculo', exact: true }).fill('Pedro');
  await page
    .getByRole('textbox', { name: 'Nome do novo círculo', exact: true })
    .fill('Amigos do teste');
  await page.getByRole('button', { name: 'Criar círculo privado' }).click();
  await expect(page.getByText('Amigos do teste', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Enquete A/B', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Sua mensagem', exact: true })
    .fill('Qual look combina com o passeio?');
  await page.getByRole('button', { name: 'Domingo sem pressa', exact: true }).click();
  await page.getByRole('button', { name: 'Pronto para o dia', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar ao círculo', exact: true }).click();
  await page.getByRole('button', { name: 'Votar em A · 0 voto(s)', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Votar em A · 1 voto(s)', exact: true }),
  ).toBeVisible();
  const social = await (await page.request.get(`${origin}/__fixture/preview/v1/circles`)).json();
  const message = social.circles[0].messages[0];
  expect(Object.keys(message.cards[0]).sort()).toEqual(['slots', 'title']);
  expect(JSON.stringify(message.cards)).not.toContain('photo_path');
  await capture(page, 'docs/screenshots/23-circulos.png');
  await page.getByRole('button', { name: 'Recriar no meu closet', exact: true }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Remix com meu closet', exact: true }),
  ).toBeVisible();
});
test('local cutout can be undone and the batch flow saves only confirmed pieces', async ({
  page,
}) => {
  const before = await snapshot(page);
  await open(page, 'sprint');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher fotos das minhas peças' }).click();
  await (await chooser).setFiles(path.resolve('docs/preview-assets/cap.jpg'));
  await expect(page.getByRole('button', { name: 'Remover fundo neste computador' })).toBeVisible();
  await page.getByRole('button', { name: 'Remover fundo neste computador' }).click();
  await expect(page.getByRole('button', { name: 'Desfazer recorte' })).toBeVisible({
    timeout: 35000,
  });
  await page.getByRole('button', { name: 'Desfazer recorte' }).click();
  await expect(page.getByRole('button', { name: 'Remover fundo neste computador' })).toBeVisible();
  expect((await snapshot(page)).items.length).toBe(before.items.length);
  await page
    .getByRole('textbox', { name: 'Nome da peça *', exact: true })
    .fill('Boné do cadastro em sequência');
  await page.getByRole('textbox', { name: 'Cor *', exact: true }).fill('Branco');
  await page.getByRole('textbox', { name: 'Tamanho *', exact: true }).fill('Único');
  await page.getByRole('button', { name: 'Guardar e continuar' }).click();
  await expect(page.getByText('Peças adicionadas', { exact: true })).toBeVisible();
  await expect(page.getByText('1 de 1 peças guardadas', { exact: true })).toBeVisible();
  expect((await snapshot(page)).items.length).toBe(before.items.length + 1);
  // Release the file-picker document and image resources before Playwright disposes its context.
  await page.goto('about:blank');
});
test('style hub fits a narrow screen and update SQL excludes the initial schema', async ({
  page,
}) => {
  await open(page, 'hub');
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'docs/screenshots/19-espaco-de-estilo.png');
  const sql = await (await page.request.get(`${origin}/__upgrade-migration`)).text();
  expect(sql).toContain('create table public.closet_profiles');
  expect(sql).toContain('create table public.style_circles');
  expect(sql).not.toContain('create table public.wardrobe_items');
  expect(sql.match(/^begin;/gm)).toHaveLength(1);
  expect(sql.match(/^commit;/gm)).toHaveLength(1);
});
