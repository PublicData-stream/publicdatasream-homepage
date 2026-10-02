import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LanguageSchema } from '../src/lib/content-schema.ts'
import { NormalizeLanguage } from '../src/lib/languages.ts'
import { DirectoryPath, GetLanguage, GetPublishedLanguages, LocalizedServers, ResolvePolicy, ServerPath } from '../src/lib/localization.ts'
import { ValidateCatalog, type ServerRecord, type PolicyRecord } from '../src/lib/catalog-validation.ts'

test('registered language codes normalize and unsupported identifiers fail', () => {
  assert.equal(LanguageSchema.parse(undefined), 'en')
  for (const Code of ['en', 'eng', ' ENG ']) assert.equal(NormalizeLanguage(Code), 'en')
  assert.equal(NormalizeLanguage('kor'), 'ko')
  assert.equal(NormalizeLanguage('ace'), 'ace')
  for (const Code of ['', 'xx', 'zzx', 'und', 'mul', 'zxx', 'en-US', 'zh-Hant', '../en', 'english']) {
    assert.equal(LanguageSchema.safeParse(Code).success, false, Code)
  }
  assert.deepEqual(GetPublishedLanguages().map((Language) => Language.Code), ['en', 'ko'])
  assert.equal(GetLanguage('eng').Code, 'en')
  assert.equal(GetLanguage('kor').Code, 'ko')
  assert.equal(GetLanguage('ko').Messages.Count(0), '서버 0개')
  assert.equal(GetLanguage('ko').Messages.Count(1), '서버 1개')
  assert.equal(GetLanguage('ko').Messages.Count(1200), '서버 1,200개')
  assert.equal(GetLanguage('ko').Messages.ConfigurationExample('Codex'), 'Codex 구성 예시')
  assert.throws(() => GetLanguage('ace'), /not published/)
  assert.equal(DirectoryPath(), '/')
  assert.equal(ServerPath('example', 'kor'), '/ko/servers/example/')
})

const EnglishServer: ServerRecord = { id: 'example', body: 'English instructions.', data: { slug: 'example', terms: 'example-terms' } }
const KoreanServer: ServerRecord = { ...EnglishServer, id: 'ko/example', data: { ...EnglishServer.data, language: 'ko' } }
const EnglishPolicy: PolicyRecord = { id: 'example-terms', body: 'Synthetic policy.', data: { slug: 'example-terms', server: 'example', kind: 'terms' } }
const KoreanPolicy: PolicyRecord = { ...EnglishPolicy, id: 'ko/example-terms', data: { ...EnglishPolicy.data, language: 'ko' } }
const Languages = ['en', 'ko']

test('translations require placement, published languages, uniqueness and English counterparts', () => {
  assert.doesNotThrow(() => ValidateCatalog([EnglishServer, KoreanServer], [EnglishPolicy, KoreanPolicy], Languages))
  assert.throws(() => ValidateCatalog([EnglishServer, KoreanServer], [EnglishPolicy], ['en']), /unpublished/)
  assert.throws(() => ValidateCatalog([KoreanServer], [], Languages), /English counterpart/)
  assert.throws(() => ValidateCatalog([EnglishServer, { ...KoreanServer, id: 'example-ko' }], [EnglishPolicy], Languages), /directory mismatch/)
  assert.throws(() => ValidateCatalog([EnglishServer, KoreanServer, KoreanServer], [EnglishPolicy], Languages), /Duplicate server/)
  assert.throws(() => ValidateCatalog([EnglishServer, KoreanServer], [EnglishPolicy, KoreanPolicy, KoreanPolicy], Languages), /Duplicate policy slug/)
  assert.throws(() => ValidateCatalog([EnglishServer, KoreanServer], [KoreanPolicy], Languages), /English counterpart/)
  assert.throws(() => ValidateCatalog([EnglishServer], [EnglishPolicy, KoreanPolicy], Languages), /unknown server/)
})

test('localized catalogs select each server once and policy fallback uses English', () => {
  const English = { data: { slug: 'example', name: 'Example', language: 'en' } }
  const Korean = { data: { slug: 'example', name: '한국어', language: 'ko' } }
  const Other = { data: { slug: 'other', name: 'Other', language: 'en' } }
  const Selected = LocalizedServers([Korean, English, Other], 'ko')
  assert.equal(Selected.length, 2)
  assert(Selected.includes(Korean))
  assert(Selected.includes(Other))
  assert.equal(ResolvePolicy([EnglishPolicy, KoreanPolicy], 'example-terms', 'ko'), KoreanPolicy)
  assert.equal(ResolvePolicy([EnglishPolicy], 'example-terms', 'ko'), EnglishPolicy)
  assert.doesNotThrow(() => ValidateCatalog([EnglishServer, KoreanServer], [EnglishPolicy], Languages))
  const WrongKind = { ...KoreanPolicy, data: { ...KoreanPolicy.data, kind: 'privacy' as const } }
  assert.throws(() => ValidateCatalog([EnglishServer, KoreanServer], [EnglishPolicy, WrongKind], Languages), /matching English counterpart/)
})
