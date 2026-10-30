// Open only a successfully built, explicitly selected local mode.
import { spawn } from 'node:child_process';
import { readFileSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const root = fileURLToPath(new URL('..', import.meta.url));
const mode = process.argv[2] || 'real';
if (!['real', 'preview'].includes(mode)) throw new Error('Use open-build.mjs real ou preview.');
const build = JSON.parse(
  readFileSync(path.join(root, `.tools/first-use-build-${mode}.json`), 'utf8'),
);
if (build.status !== 0 || build.mode !== mode)
  throw new Error('Compile esta versão antes de abri-la.');
const output = path.resolve(root, build.output);
if (!output.startsWith(path.join(root, '.tools') + path.sep))
  throw new Error('Diretório de exportação inválido.');
const marker = JSON.parse(readFileSync(path.join(output, '__build.json'), 'utf8'));
if (marker.app !== 'virtual-closet' || marker.mode !== mode)
  throw new Error('A versão compilada não corresponde ao modo solicitado.');
const firstPort = Number(process.argv[3] || (mode === 'real' ? 4180 : 4185));
if (!Number.isInteger(firstPort) || firstPort < 1024 || firstPort > 65525)
  throw new Error('Porta local inválida.');
let origin;
for (let port = firstPort; port < firstPort + 10; port++) {
  const candidate = `http://127.0.0.1:${port}`;
  let occupied = false;
  try {
    const response = await fetch(`${candidate}/__build.json`, {
      signal: AbortSignal.timeout(1200),
    });
    occupied = true;
    const existing = await response.json();
    if (
      existing.app === marker.app &&
      existing.mode === mode &&
      existing.builtAt === marker.builtAt
    ) {
      origin = candidate;
      break;
    }
  } catch (error) {
    if (error.cause?.message === 'bad port') occupied = true;
    /* A port with a non-JSON response stays occupied. */
  }
  if (occupied) continue;
  const log = openSync(path.join(root, `.tools/local-${mode}-${port}.log`), 'a');
  const child = spawn(
    process.execPath,
    mode === 'preview'
      ? ['scripts/design-preview.mjs', String(port), build.output]
      : ['scripts/serve-export.mjs', build.output, String(port)],
    { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', log, log] },
  );
  closeSync(log);
  let failure;
  child.on('error', (error) => {
    failure = error;
  });
  child.unref();
  for (let attempt = 0; attempt < 30; attempt++) {
    if (failure) throw failure;
    try {
      const response = await fetch(`${candidate}/__build.json`, {
        signal: AbortSignal.timeout(1000),
      });
      const active = await response.json();
      if (active.app === marker.app && active.mode === mode && active.builtAt === marker.builtAt) {
        origin = candidate;
        break;
      }
    } catch {
      /* Bounded startup health check. */
    }
    await delay(250);
  }
  if (origin) break;
  throw new Error(
    `O servidor iniciou sem confirmar a compilação. Consulte .tools/local-${mode}-${port}.log.`,
  );
}
if (!origin) throw new Error('Não foi possível abrir a versão local. Consulte .tools/local-*.log.');
const url = `${origin}${mode === 'preview' ? '/preview' : '/login'}`;
writeFileSync(
  path.join(root, `.tools/local-${mode}.json`),
  JSON.stringify({ url, origin, ...marker }, null, 2),
);
console.log(`${mode === 'real' ? 'Aplicativo conectado' : 'Prévia com exemplos'}: ${url}`);
