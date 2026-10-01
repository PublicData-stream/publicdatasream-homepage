import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { CheckDist } from '../scripts/check-dist.ts'

const Root = resolve(import.meta.dirname, '..')
const Languages = [
  { Code: 'ko', NativeName: '한국어', Direction: 'ltr' },
  { Code: 'ace', NativeName: 'Acehnese fixture', Direction: 'ltr' },
  { Code: 'ar', NativeName: 'العربية', Direction: 'rtl' },
]

const LanguageSource = [
  'import { English, type Messages } from \'./en.ts\'',
  'import type { LanguageDefinition } from \'./locales.types.ts\'',
  '',
  '// Complete synthetic dictionaries live only in this disposable test build.',
  'function FixtureMessages(Code: string, Label: string): Messages {',
  '  return Object.fromEntries(Object.entries(English).map(([Key, Value]) => [Key,',
  '    typeof Value === \'string\' ? `${Label}: ${Value}` : (Argument: number | string) =>',
  '      `${Label}: ${typeof Argument === \'number\' ? new Intl.NumberFormat(Code).format(Argument) : Argument}`,',
  '  ])) as Messages',
  '}',
  'export const PublishedLanguages: LanguageDefinition[] = [',
  '  { Code: \'en\', NativeName: \'English\', Direction: \'ltr\', Messages: English },',
  ...Languages.map((Language) => `  { Code: '${Language.Code}', NativeName: '${Language.NativeName}', Direction: '${Language.Direction}', Messages: FixtureMessages('${Language.Code}', '${Language.NativeName}') },`),
  ']',
  '',
].join('\n')

function ServerFixture(Slug: string, Language = 'en'): string {
  return [
    '---', `slug: ${Slug}`, `language: ${Language}`, `name: ${Language} ${Slug}`, `description: ${Language} synthetic offline documentation.`,
    'capabilities: [mcp]', 'codex:', '  format: text', '  config: Safe fixture configuration.',
    'claude:', '  client: Claude Code', '  unsupported: Synthetic explanation.',
    ...(Slug === 'fixture' ? ['terms: fixture-terms', 'privacy: fixture-privacy'] : []),
    '---', `## ${Language} instructions`, '', 'Read [documentation](https://example.org/docs).', '',
  ].join('\n')
}

function PolicyFixture(Kind: string, Language = 'en'): string {
  return ['---', `slug: fixture-${Kind}`, `language: ${Language}`, 'server: fixture', `kind: ${Kind}`, `title: ${Language} ${Kind} fixture`, '---', `${Language} synthetic approved fixture body.`, ''].join('\n')
}

test('static localization publishes actual translations, English fallbacks and complete discovery', { timeout: 120_000 }, async () => {
  const Fixture = await mkdtemp(join(tmpdir(), 'publicdata-localization-'))
  try {
    for (const Path of ['src', 'public', 'astro.config.ts', 'tsconfig.json', 'package.json']) {
      await cp(join(Root, Path), join(Fixture, Path), { recursive: true })
    }
    await symlink(join(Root, 'node_modules'), join(Fixture, 'node_modules'), 'dir')
    const Definitions = await readFile(join(Root, 'src/i18n/locales.ts'), 'utf8')
    await writeFile(join(Fixture, 'src/i18n/locales.types.ts'), Definitions)
    // Preserve the public type export used by localization.ts.
    await writeFile(join(Fixture, 'src/i18n/locales.ts'), `${LanguageSource}\nexport type { LanguageDefinition } from './locales.types.ts'\n`)
    const Build = () => execFileSync(process.execPath, [join(Root, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', Fixture], {
      cwd: Fixture, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, stdio: 'pipe', timeout: 30_000,
    })
    const Read = (Path: string) => readFile(join(Fixture, 'dist', Path), 'utf8')
    Build()
    assert.equal(await CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), 5)
    for (const Language of Languages) {
      assert.match(await Read(`${Language.Code}/index.html`), /No servers listed yet/)
      assert.match(await Read(`${Language.Code}/index.md`), /No servers listed yet/)
    }
    await writeFile(join(Fixture, 'src/content/servers/fixture.md'), ServerFixture('fixture'))
    await writeFile(join(Fixture, 'src/content/servers/other.md'), ServerFixture('other'))
    for (const Kind of ['terms', 'privacy']) {
      await writeFile(join(Fixture, `src/content/policies/fixture-${Kind}.md`), PolicyFixture(Kind))
    }
    for (const Code of ['ko', 'ace']) {
      await mkdir(join(Fixture, `src/content/servers/${Code}`), { recursive: true })
      await writeFile(join(Fixture, `src/content/servers/${Code}/fixture.md`), ServerFixture('fixture', Code))
    }
    await mkdir(join(Fixture, 'src/content/policies/ko'), { recursive: true })
    await writeFile(join(Fixture, 'src/content/policies/ko/fixture-terms.md'), PolicyFixture('terms', 'ko'))
    Build()
    assert.equal(await CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), 12)
    for (const Language of Languages) {
      const Html = await Read(`${Language.Code}/index.html`)
      assert(Html.includes(`<html lang="${Language.Code}" dir="${Language.Direction}">`))
      assert.equal((Html.match(/class="server-card"/g) ?? []).length, 2)
      assert(Html.includes(Language.NativeName))
      assert(Html.includes('href="/servers/other/"'))
      assert(Html.includes('lang="en" dir="ltr"'))
      assert(Html.includes(`${Language.NativeName}: Documentation in English`))
      const Markdown = await Read(`${Language.Code}/index.md`)
      assert(Markdown.includes('https://publicdata.stream/servers/other/index.md'))
      assert(Markdown.includes(`${Language.NativeName}: Documentation in English`))
      if (Language.Code === 'ar') {
        await assert.rejects(access(join(Fixture, 'dist/ar/servers/fixture/index.html')))
        continue
      }
      assert(Html.includes(`href="/${Language.Code}/servers/fixture/"`))
      const Document = await Read(`${Language.Code}/servers/fixture/index.html`)
      const Source = await Read(`${Language.Code}/servers/fixture/index.md`)
      assert(Document.includes(`${Language.NativeName}: Installation &amp; configuration`))
      assert(Source.includes(`${Language.NativeName}: Installation & configuration`))
      assert(Document.includes(`href="/${Language.Code}/#servers"`))
      assert(Document.includes('href="/servers/fixture/privacy/"'))
      assert(Source.includes('https://publicdata.stream/servers/fixture/privacy/index.md'))
      assert(Document.includes(`hreflang="${Language.Code}"`))
      assert(!Document.includes('hreflang="ar"'))
      assert(Document.includes('hreflang="x-default" href="https://publicdata.stream/servers/fixture/"'))
      await assert.rejects(access(join(Fixture, `dist/${Language.Code}/servers/fixture/privacy/index.html`)))
      await assert.rejects(access(join(Fixture, `dist/${Language.Code}/servers/other/index.html`)))
    }
    const Korean = await Read('ko/servers/fixture/index.html')
    assert(Korean.includes('href="/ko/servers/fixture/terms/"'))
    assert((await Read('ko/servers/fixture/index.md')).includes('https://publicdata.stream/ko/servers/fixture/terms/index.md'))
    assert((await Read('ko/servers/fixture/terms/index.html')).includes('href="/ko/servers/fixture/"'))
    const Llms = await Read('llms.txt')
    for (const Code of ['en', 'ko', 'ace', 'ar']) assert(Llms.includes(`(${Code})`))
    assert.equal((Llms.match(/https:\/\/publicdata.stream\/servers\/other\/index.md/g) ?? []).length, 1)
    assert(!(await Read('sitemap.xml')).includes('/ar/servers/'))
    assert(!(await Read('404.html')).includes('hreflang='))

    // The output guard must reject incorrect language and stale alternates.
    const PagePath = join(Fixture, 'dist/ko/servers/fixture/index.html')
    await writeFile(PagePath, Korean.replace('lang="ko"', 'lang="xx"'))
    await assert.rejects(CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), /registered ISO/)
    await writeFile(PagePath, Korean.replace('hreflang="ko"', 'hreflang="ar"'))
    await assert.rejects(CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), /hreflang/)
    await writeFile(PagePath, Korean)

    // Missing UI keys and unsafe translated Markdown must abort static builds.
    const ConfigPath = join(Fixture, 'src/i18n/locales.ts')
    const Config = await readFile(ConfigPath, 'utf8')
    await writeFile(ConfigPath, Config.replace('Object.entries(English)', 'Object.entries(English).filter(([Key]) => Key !== \'Skip\')'))
    assert.throws(Build, /Incomplete dictionary/)
    await writeFile(ConfigPath, Config)
    await writeFile(join(Fixture, 'src/content/servers/ko/fixture.md'), `${ServerFixture('fixture', 'ko')}\n[unsafe](javascript:alert)\n`)
    assert.throws(Build, /Command failed/)
  } finally {
    await rm(Fixture, { recursive: true, force: true })
  }
})
