import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
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
async function reference(page: Page) {
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
  await expect(page.getByRole('heading', { name: 'Botas e chevron', exact: true })).toBeVisible();
}
test('photographic collection keeps source, notes, cover and explicit sharing', async ({
  page,
}) => {
  await start(page);
  await reference(page);
  await page.getByRole('button', { name: 'Guardar em coleção', exact: true }).click();
  await page.getByLabel('Nome da coleção', { exact: true }).fill('Minha próxima fase');
  await page.getByRole('button', { name: 'Criar coleção privada', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nome da coleção', exact: true })).toHaveValue(
    'Minha próxima fase',
  );
  await page
    .getByLabel('Ideia por trás da coleção', { exact: true })
    .fill('Usar o que já tenho com uma camada nova.');
  await page.getByRole('button', { name: 'Salvar detalhes da coleção', exact: true }).click();
  await page.getByRole('button', { name: 'Usar como capa', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Capa atual', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Ideia por trás da coleção', { exact: true })).toHaveValue(
    'Usar o que já tenho com uma camada nova.',
  );
  await page.getByRole('button', { name: 'Escolher amizade', exact: true }).click();
  await expect(page.getByRole('button', { name: /Convidar @/ }).first()).toBeVisible();
  await page
    .getByRole('button', { name: /Convidar @/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: /Revogar acesso de @/ }).first()).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/60-colecao.png' });
});
test('mural-to-editor saves a draft, restores it, branches and saves only owned clothes', async ({
  page,
}) => {
  await start(page);
  await reference(page);
  await page.getByRole('button', { name: 'Abrir no ateliê', exact: true }).click();
  await page.getByLabel('Nome da composição', { exact: true }).fill('Minha nova combinação');
  await page.getByRole('button', { name: 'Adicionar recorte da inspiração', exact: true }).click();
  await page.getByRole('button', { name: 'Parte de baixo', exact: true }).first().click();
  await page
    .getByRole('checkbox', { name: 'Adicionar ao painel Camiseta essencial', exact: true })
    .click();
  await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar rascunho na minha conta', exact: true }).click();
  await expect(page.getByText('Rascunho salvo na sua conta.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome da composição', { exact: true })).toHaveValue(
    'Minha nova combinação',
  );
  await page.getByRole('button', { name: 'Salvar minhas peças como look', exact: true }).click();
  await expect(
    page.getByText('Look salvo. A composição está preservada e você pode criar outra versão.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Criar uma nova versão', exact: true }).click();
  await expect(page.getByLabel('Nome da composição', { exact: true })).toHaveValue(
    'Minha nova combinação · versão',
  );
  await page.screenshot({ path: 'docs/screenshots/61-editor.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('personal photo preview and manual garment cutout stay on device', async ({ page }) => {
  const uploads: string[] = [];
  page.on('request', (r) => {
    if (
      ['POST', 'PUT'].includes(r.method()) &&
      /\/storage\/v1\/object\/(closet-photos|mural-photos)/.test(r.url())
    )
      uploads.push(r.url());
  });
  await start(page);
  await reference(page);
  await page.getByRole('button', { name: 'Sobre minha foto', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: 'Escolher minha foto para a prévia', exact: true })
    .click();
  await (await chooser).setFiles(path.resolve('assets/mural/street-full.jpg'));
  await expect(page.getByRole('img', { name: 'Sua foto pessoal', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Selecionar a peça nesta referência', exact: true })
    .click();
  const area = page.getByRole('button', { name: 'Marcar contorno da roupa', exact: true });
  await expect(area).toBeVisible();
  const box = (await area.boundingBox())!;
  for (const [x, y] of [
    [0.2, 0.3],
    [0.8, 0.3],
    [0.8, 0.8],
    [0.2, 0.8],
  ])
    await area.click({ position: { x: box.width * x!, y: box.height * y! } });
  await page.getByRole('button', { name: 'Usar este recorte', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ampliar peça', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/63-previa-pessoal.png' });
  await page.getByRole('button', { name: 'Guardar versão A nesta sessão', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar com a versão A', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Voltar à versão B', exact: true })).toBeVisible();
  expect(uploads).toEqual([]);
  await page.getByRole('button', { name: 'Apagar minha foto e esta prévia', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Sua foto pessoal', exact: true })).toHaveCount(0);
});
test('batch photo queue survives reload and portable cutout returns a result', async ({ page }) => {
  test.setTimeout(120000);
  await start(page);
  await page.goto(`${origin}/style?view=sprint`);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher fotos das minhas peças', exact: true }).click();
  await (
    await chooser
  ).setFiles([
    path.resolve('docs/preview-assets/tee.jpg'),
    path.resolve('docs/preview-assets/cap.jpg'),
  ]);
  await expect(page.getByText('0 de 2 peças guardadas', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('0 de 2 peças guardadas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover fundo neste aparelho', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Desfazer recorte', exact: true })).toBeVisible({
    timeout: 55000,
  });
});
test('forecast selection informs real daily suggestions and account data downloads', async ({
  page,
}) => {
  await page.route('https://geocoding-api.open-meteo.com/**', (r) =>
    r.fulfill({
      json: {
        results: [
          {
            id: 1,
            name: 'São Paulo',
            admin1: 'SP',
            country: 'Brasil',
            latitude: -23.55,
            longitude: -46.63,
          },
        ],
      },
    }),
  );
  await page.route('https://api.open-meteo.com/**', (r) =>
    r.fulfill({
      json: {
        daily: {
          time: [new Date().toLocaleDateString('en-CA')],
          temperature_2m_min: [17],
          temperature_2m_max: [30],
          precipitation_probability_max: [70],
        },
      },
    }),
  );
  await start(page);
  await page.goto(`${origin}/style?view=today`);
  await page.getByRole('button', { name: 'Consultar previsão por cidade', exact: true }).click();
  await page.getByLabel('Cidade da previsão', { exact: true }).fill('São Paulo');
  await page.getByRole('button', { name: 'Buscar cidade', exact: true }).click();
  await page.getByRole('button', { name: 'São Paulo · SP', exact: true }).click();
  await expect(page.getByText('Probabilidade de chuva: 70%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Usar este clima nas sugestões', exact: true }).click();
  await page.goto(`${origin}/account-data`);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar meus dados', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/virtual-closet-dados-.*\.json/);
  const images = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar minhas imagens · lote 1', exact: true }).click();
  const file = await images;
  expect(file.suggestedFilename()).toBe('virtual-closet-imagens-1.zip');
  const entries = unzipSync(readFileSync((await file.path())!));
  expect(entries['manifesto.json']).toBeTruthy();
  expect(Object.keys(entries).filter(name => name.startsWith('closet-photos/')).length).toBeGreaterThan(0);
});
