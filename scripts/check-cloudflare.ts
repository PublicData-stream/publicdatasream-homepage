import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

function AssertKeys(Value: unknown, Allowed: readonly string[], Label: string): asserts Value is Record<string, unknown> {
  assert(Value !== null && typeof Value === 'object' && !Array.isArray(Value), `${Label} must be an object.`)
  for (const Key of Object.keys(Value)) {
    assert(Allowed.includes(Key), `${Label} contains an option outside the static-only deployment contract.`)
  }
}

export function AssertStaticDeployment(Config: unknown): void {
  // An allowlist also rejects future provisioning options and environment overrides.
  AssertKeys(Config, ['$schema', 'name', 'compatibility_date', 'assets'], 'Wrangler configuration')
  assert.equal(Config.$schema, './node_modules/wrangler/config-schema.json')
  assert.equal(Config.name, 'publicdatasream-homepage')
  // assert.match checks the input type at runtime as well as its format.
  assert.match(Config.compatibility_date as string, /^\d{4}-\d{2}-\d{2}$/)
  AssertKeys(Config.assets, ['directory', 'html_handling', 'not_found_handling'], 'Asset configuration')
  assert.equal(Config.assets.directory, './dist', 'Only the verified dist directory may be uploaded.')
  assert.equal(Config.assets.html_handling, 'force-trailing-slash')
  assert.equal(Config.assets.not_found_handling, '404-page')
}

if (import.meta.main) {
  // Keep wrangler.jsonc JSON-compatible so the guard needs no additional parser.
  const Config: unknown = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
  AssertStaticDeployment(Config)
  console.log('Cloudflare configuration verified: static assets only; no Worker entrypoint or resource bindings.')
}
