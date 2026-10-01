import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { AssertStaticDeployment } from '../scripts/check-cloudflare.ts'

const ParsedConfig: unknown = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
assert(ParsedConfig !== null && typeof ParsedConfig === 'object' && !Array.isArray(ParsedConfig))
const Config = ParsedConfig as Record<string, unknown>
assert(Config.assets !== null && typeof Config.assets === 'object' && !Array.isArray(Config.assets))
const Assets = Config.assets as Record<string, unknown>

test('the deployment configuration serves the verified static site', () => {
  assert.doesNotThrow(() => AssertStaticDeployment(Config))
})

test('deployment verification rejects executable code, provisioning, and environment overrides', () => {
  const RuntimeOptions = {
    main: 'src/worker.ts',
    kv_namespaces: [{ binding: 'CACHE', id: 'synthetic' }],
    d1_databases: [{ binding: 'DB', database_id: 'synthetic' }],
    r2_buckets: [{ binding: 'BUCKET', bucket_name: 'synthetic' }],
    durable_objects: { bindings: [{ name: 'STATE', class_name: 'State' }] },
    queues: { producers: [{ binding: 'QUEUE', queue: 'synthetic' }] },
    services: [{ binding: 'API', service: 'synthetic' }],
    triggers: { crons: ['* * * * *'] },
    env: { production: { main: 'src/worker.ts' } },
    build: { command: 'generate-worker' },
    observability: { enabled: true },
    future_resource: { binding: 'FUTURE' },
  }
  for (const [Key, Value] of Object.entries(RuntimeOptions)) {
    assert.throws(() => AssertStaticDeployment({ ...Config, [Key]: Value }), /static-only deployment contract/, Key)
  }
})

test('deployment verification rejects asset bindings, script-first routing, and alternate output', () => {
  for (const Override of [
    { binding: 'ASSETS' },
    { run_worker_first: true },
    { run_worker_first: ['/api/*'] },
    { directory: './' },
    { not_found_handling: 'single-page-application' },
  ]) {
    assert.throws(() => AssertStaticDeployment({ ...Config, assets: { ...Assets, ...Override } }))
  }
})

test('deployment verification rejects missing or malformed configuration objects', () => {
  for (const Invalid of [null, [], {}, { ...Config, assets: null }, { ...Config, assets: [] }]) {
    assert.throws(() => AssertStaticDeployment(Invalid))
  }
})
