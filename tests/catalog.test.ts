import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCatalog, type ServerRecord, type PolicyRecord } from '../src/lib/catalog-validation.ts';

const server: ServerRecord = { id: 'example', body: 'Installation instructions.', data: { slug: 'example' } };
const policy: PolicyRecord = { id: 'example-terms', body: 'Synthetic fixture content.', data: { slug: 'example-terms', server: 'example', kind: 'terms' } };

test('empty catalog and missing deferred policies are valid', () => {
  assert.doesNotThrow(() => validateCatalog([], []));
  assert.doesNotThrow(() => validateCatalog([server], []));
  assert.doesNotThrow(() => validateCatalog([{ ...server, data: { ...server.data, terms: 'example-terms' } }], [policy]));
});

test('policy references must exist and match server and kind', () => {
  const linked = { ...server, data: { ...server.data, terms: 'example-terms' } };
  assert.throws(() => validateCatalog([linked], []), /invalid terms/);
  assert.throws(() => validateCatalog([linked], [{ ...policy, data: { ...policy.data, kind: 'privacy' } }]), /invalid terms/);
  assert.throws(() => validateCatalog([server], [{ ...policy, data: { ...policy.data, server: 'unknown' } }]), /unknown server/);
});

test('duplicate slugs, duplicate policy routes, and empty bodies fail', () => {
  assert.throws(() => validateCatalog([server, { ...server, id: 'duplicate' }], []), /Duplicate server/);
  assert.throws(() => validateCatalog([server], [policy, policy]), /Duplicate policy slug/);
  assert.throws(() => validateCatalog([server], [policy, { ...policy, id: 'duplicate', data: { ...policy.data, slug: 'other' } }]), /Duplicate policy route/);
  assert.throws(() => validateCatalog([{ ...server, body: '' }], []), /installation instructions/);
  assert.throws(() => validateCatalog([server], [{ ...policy, body: '' }]), /policy content/);
});
