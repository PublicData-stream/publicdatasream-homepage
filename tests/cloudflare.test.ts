import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { assertStaticDeployment } from '../scripts/check-cloudflare.mjs';

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));

test('the deployment configuration serves the verified static site', () => {
  assert.doesNotThrow(() => assertStaticDeployment(config));
});

test('deployment verification rejects executable code, provisioning, and environment overrides', () => {
  const runtimeOptions = {
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
  };
  for (const [key, value] of Object.entries(runtimeOptions)) {
    assert.throws(() => assertStaticDeployment({ ...config, [key]: value }), /static-only deployment contract/, key);
  }
});

test('deployment verification rejects asset bindings, script-first routing, and alternate output', () => {
  for (const override of [
    { binding: 'ASSETS' },
    { run_worker_first: true },
    { run_worker_first: ['/api/*'] },
    { directory: './' },
    { not_found_handling: 'single-page-application' },
  ]) {
    assert.throws(() => assertStaticDeployment({ ...config, assets: { ...config.assets, ...override } }));
  }
});

test('deployment verification rejects missing or malformed configuration objects', () => {
  for (const invalid of [null, [], {}, { ...config, assets: null }, { ...config, assets: [] }]) {
    assert.throws(() => assertStaticDeployment(invalid));
  }
});
