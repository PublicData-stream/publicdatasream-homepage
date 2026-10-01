import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function assertKeys(value, allowed, label) {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object.`);
  for (const key of Object.keys(value)) {
    assert(allowed.includes(key), `${label} contains an option outside the static-only deployment contract.`);
  }
}

export function assertStaticDeployment(config) {
  // An allowlist also rejects future provisioning options and environment overrides.
  assertKeys(config, ['$schema', 'name', 'compatibility_date', 'assets'], 'Wrangler configuration');
  assert.equal(config.$schema, './node_modules/wrangler/config-schema.json');
  assert.equal(config.name, 'publicdatasream-homepage');
  assert.match(config.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
  assertKeys(config.assets, ['directory', 'html_handling', 'not_found_handling'], 'Asset configuration');
  assert.equal(config.assets.directory, './dist', 'Only the verified dist directory may be uploaded.');
  assert.equal(config.assets.html_handling, 'force-trailing-slash');
  assert.equal(config.assets.not_found_handling, '404-page');
}

if (import.meta.main) {
  // Keep wrangler.jsonc JSON-compatible so the guard needs no additional parser.
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assertStaticDeployment(config);
  console.log('Cloudflare configuration verified: static assets only; no Worker entrypoint or resource bindings.');
}
