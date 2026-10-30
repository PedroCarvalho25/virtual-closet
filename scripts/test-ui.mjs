// Limit browser lifetime to one scenario because this Windows environment stalled between tests.
// Every scenario must exit successfully; a timeout is a failure, never a passing suite.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const run = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.join(root, '.tools', 'ui-runs', run);
mkdirSync(dir, { recursive: true });
const files = readdirSync(path.join(root, 'tests', 'ui'))
  .filter((file) => file.endsWith('.spec.ts'))
  .sort();
const grepIndex = process.argv.indexOf('--grep');
const grep = grepIndex >= 0 ? process.argv[grepIndex + 1] : undefined;
if (grepIndex >= 0 && !grep) throw new Error('Informe o padrão depois de --grep.');
const listing = spawnSync(
  process.execPath,
  [
    'node_modules/@playwright/test/cli.js',
    'test',
    ...process.argv.slice(2).filter((arg) => arg.endsWith('.spec.ts')),
    ...(grep ? ['--grep', grep] : []),
    '--list',
    '--reporter=list',
  ],
  { cwd: root, env: process.env, windowsHide: true, encoding: 'utf8', timeout: 20000 },
);
if (listing.status !== 0)
  throw new Error(
    `Não foi possível listar os testes: ${listing.stderr || listing.error?.message || ''}`,
  );
const cases = [...listing.stdout.matchAll(/^\s+([\w.-]+\.spec\.ts):(\d+):\d+\s+›\s+(.+)$/gm)];
const expected = Number(listing.stdout.match(/Total: (\d+) tests?/)?.[1]);
if (!cases.length || cases.length !== expected)
  throw new Error('Lista incompleta de testes; nenhum cenário foi executado.');
const results = [];
const requestedStart = process.argv.slice(2).find((arg) => /\.spec\.ts:\d+$/.test(arg));
const startAt = requestedStart
  ? cases.findIndex(([, file, line]) => `${file}:${line}` === requestedStart)
  : 0;
if (startAt < 0)
  throw new Error(
    'Cenário inicial não encontrado. Use o arquivo e a linha exibidos por playwright test --list.',
  );
for (const [, file, line, title] of cases.slice(startAt)) {
  if (!files.includes(file)) throw new Error('Arquivo de teste inesperado.');
  console.log(`\nVerificando ${file}:${line} — ${title}`);
  const r = spawnSync(
    process.execPath,
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      `tests/ui/${file}:${line}`,
      '--trace',
      'off',
      '--global-timeout',
      '60000',
      '--output',
      path.join(dir, `${file.replace('.spec.ts', '')}-${line}`),
    ],
    {
      cwd: root,
      env: process.env,
      windowsHide: true,
      encoding: 'utf8',
      timeout: 75000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const log = `${r.stdout || ''}\n${r.stderr || ''}`;
  writeFileSync(path.join(dir, `${file}-${line}.log`), log);
  process.stdout.write(log);
  results.push({ file, line: Number(line), title, status: r.status, error: r.error?.message });
  writeFileSync(path.join(dir, 'results.json'), JSON.stringify(results, null, 2));
  writeFileSync(
    path.join(root, '.tools', 'ui-latest.json'),
    JSON.stringify({ run, results }, null, 2),
  );
  if (r.status !== 0) {
    process.exitCode = 1;
  }
}
console.log(`Resultados: ${dir}`);
