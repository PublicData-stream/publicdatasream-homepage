import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ValidateCatalog, type ServerRecord, type PolicyRecord } from '../src/lib/catalog-validation.ts'

const Server: ServerRecord = { id: 'example', body: 'Installation instructions.', data: { slug: 'example' } }
const Policy: PolicyRecord = { id: 'example-terms', body: 'Synthetic fixture content.', data: { slug: 'example-terms', server: 'example', kind: 'terms' } }

test('empty catalog and missing deferred policies are valid', () => {
  assert.doesNotThrow(() => ValidateCatalog([], []))
  assert.doesNotThrow(() => ValidateCatalog([Server], []))
  assert.doesNotThrow(() => ValidateCatalog([{ ...Server, data: { ...Server.data, terms: 'example-terms' } }], [Policy]))
})

test('policy references must exist and match server and kind', () => {
  const Linked = { ...Server, data: { ...Server.data, terms: 'example-terms' } }
  assert.throws(() => ValidateCatalog([Linked], []), /invalid terms/)
  assert.throws(() => ValidateCatalog([Linked], [{ ...Policy, data: { ...Policy.data, kind: 'privacy' } }]), /invalid terms/)
  assert.throws(() => ValidateCatalog([Server], [{ ...Policy, data: { ...Policy.data, server: 'unknown' } }]), /unknown server/)
})

test('duplicate slugs, duplicate policy routes, and empty bodies fail', () => {
  assert.throws(() => ValidateCatalog([Server, { ...Server, id: 'duplicate' }], []), /Duplicate server/)
  assert.throws(() => ValidateCatalog([Server], [Policy, Policy]), /Duplicate policy slug/)
  assert.throws(() => ValidateCatalog([Server], [Policy, { ...Policy, id: 'duplicate', data: { ...Policy.data, slug: 'other' } }]), /Duplicate policy route/)
  assert.throws(() => ValidateCatalog([{ ...Server, body: '' }], []), /installation instructions/)
  assert.throws(() => ValidateCatalog([Server], [{ ...Policy, body: '' }]), /policy content/)
})
