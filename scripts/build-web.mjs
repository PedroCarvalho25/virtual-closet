// Build explicit demo or real local exports. Private configuration is never logged.
import { preparePwa } from './prepare-pwa.mjs';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validSupabaseConfig } from '../src/lib/config.ts';
const root = fileURLToPath(new URL('..', import.meta.url));
const mode = process.argv[2];
if (!['preview', 'real'].includes(mode)) throw new Error('Use build-web.mjs preview ou real.');
const configured =
  mode === 'real'
    ? parseEnv(readFileSync(path.join(root, '.env.local'), 'utf8'))
    : {
        EXPO_PUBLIC_SUPABASE_URL: 'https://closet-test.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_only_not_a_real_key',
      };
if (
  !validSupabaseConfig(
    configured.EXPO_PUBLIC_SUPABASE_URL || '',
    configured.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  )
)
  throw new Error('Confira a configuração pública existente no arquivo local.');
const output = `.tools/web-${mode}-${Date.now()}`;
mkdirSync(path.join(root, '.tools'), { recursive: true });
const log = createWriteStream(path.join(root, `.tools/first-use-build-${mode}.log`));
const child = spawn(
  process.execPath,
  [
    'node_modules/expo/bin/cli',
    'export',
    '--platform',
    'web',
    '--clear',
    '--max-workers',
    '2',
    '--output-dir',
    output,
  ],
  {
    cwd: root,
    windowsHide: true,
    env: {
      ...process.env,
      ...configured,
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
      EXPO_NO_DOTENV: '1',
      EXPO_PUBLIC_IDEAS_PREVIEW: mode === 'preview' ? '1' : '',
      __UNSAFE_EXPO_HOME_DIRECTORY: path.join(root, '.tools/expo-home'),
    },
  },
);
child.stdout.pipe(log, { end: false });
child.stderr.pipe(log, { end: false });
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
  log.end();
});
child.on('close', (status) => {
  status = typeof status === 'number' ? status : 1;
  // Metro may reuse environment substitutions across exports. Verify the
  // selected configuration in the actual bundle without logging its values.
  if (status === 0) {
    try {
      const directory = path.join(root, output, '_expo/static/js/web');
      const entry = readdirSync(directory).find(
        (file) => file.startsWith('entry-') && file.endsWith('.js'),
      );
      const code = readFileSync(path.join(directory, entry || ''), 'utf8');
      if (
        !code.includes(configured.EXPO_PUBLIC_SUPABASE_URL) ||
        !code.includes(configured.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
        (mode === 'real' && code.includes('sb_publishable_fixture_only_not_a_real_key'))
      )
        throw new Error('A configuração do bundle não corresponde ao modo solicitado.');
    } catch (error) {
      console.error(error.message);
      status = 1;
    }
  }
  const completedAt = new Date().toISOString();
  if (status === 0) { try { preparePwa(path.join(root, output), mode, completedAt); } catch (e) { console.error(e.message); status = 1; } }
  const result = { mode, output, status, completedAt };
  writeFileSync(
    path.join(root, `.tools/first-use-build-${mode}.json`),
    JSON.stringify(result, null, 2),
  );
  if (status === 0)
    writeFileSync(
      path.join(root, output, '__build.json'),
      JSON.stringify({ app: 'virtual-closet', mode, builtAt: result.completedAt }),
    );
  log.end();
  process.exitCode = status || 0;
});
