import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const base = {
  ...process.env,
  CI: '1',
  EXPO_NO_TELEMETRY: '1',
  EXPO_NO_DOTENV: '1',
  __UNSAFE_EXPO_HOME_DIRECTORY: path.join(root, '.tools', 'expo-home'),
};
// These exports are isolated from real credentials and are never published.
for (const configured of [false, true]) {
  const env = {
    ...base,
    EXPO_PUBLIC_SUPABASE_URL: configured ? 'https://closet-test.supabase.co' : '',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: configured
      ? 'sb_publishable_fixture_only_not_a_real_key'
      : '',
    EXPO_PUBLIC_IDEAS_PREVIEW: configured ? '1' : '',
  };
  const output = configured ? '.tools/web-test' : '.tools/web-setup';
  const result = spawnSync(
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
    { cwd: root, env, stdio: 'inherit', timeout: 300000, windowsHide: true },
  );
  if (result.status !== 0) {
    console.error('Test export failed.', result.error?.message || '');
    process.exit(result.status || 1);
  }
}
