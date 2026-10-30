// Opens the already prepared, loopback-only presentation. No build, upload or paid service.
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:4175';
async function running() {
  let response;
  try {
    response = await fetch(`${origin}/__health`, { signal: AbortSignal.timeout(1000) });
  } catch {
    return false;
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('PORT_BUSY');
  }
  if (data.app !== 'virtual-closet-preview' || data.version !== 'presentation-2026-10-09')
    throw new Error('PORT_BUSY');
  return true;
}
try {
  await access(path.join(root, '.tools/web-test/index.html'));
  if (!(await running())) {
    await mkdir(path.join(root, '.tools'), { recursive: true });
    const out = openSync(path.join(root, '.tools/design-preview.log'), 'a');
    const err = openSync(path.join(root, '.tools/design-preview.err.log'), 'a');
    const child = spawn(process.execPath, [path.join(root, 'scripts/design-preview.mjs'), '4175'], {
      cwd: root,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', out, err],
    });
    child.unref();
    closeSync(out);
    closeSync(err);
    await writeFile(path.join(root, '.tools/design-preview.pid'), String(child.pid));
    let ready = false;
    for (let count = 0; count < 20 && !ready; count++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      ready = await running();
    }
    if (!ready) throw new Error('NOT_READY');
  }
  // The visible browser is the presentation itself. The launcher window stays hidden.
  const browser = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', `Start-Process '${origin}/preview'`],
    { windowsHide: true, stdio: 'ignore' },
  );
  browser.unref();
  console.log(`Prévia pronta: ${origin}/preview`);
} catch (error) {
  console.error(
    error.code === 'ENOENT'
      ? 'A prévia ainda precisa ser preparada. Envie este aviso no chat.'
      : error.message === 'PORT_BUSY'
        ? 'A porta da prévia está ocupada por outra versão. Envie este aviso no chat.'
        : 'Não consegui abrir a prévia. Envie este aviso no chat para verificarmos o servidor.',
  );
  process.exitCode = 1;
}
