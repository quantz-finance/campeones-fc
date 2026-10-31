// Build web para e2e apuntando al Supabase local (e2e/.stack.json). Sale en dist-e2e/, nunca en dist/.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const stack = JSON.parse(readFileSync('e2e/.stack.json', 'utf8'));
const env = {
  ...process.env,
  EXPO_PUBLIC_SUPABASE_URL: stack.url,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: stack.anonKey,
  EXPO_NO_TELEMETRY: '1',
};
execFileSync('npx', ['expo', 'export', '-p', 'web', '--output-dir', 'dist-e2e', '--clear'], { stdio: 'inherit', env });
execFileSync('node', ['scripts/build/postbuild.mjs', 'dist-e2e'], { stdio: 'inherit', env });
