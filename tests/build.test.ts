import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { CheckDist } from '../scripts/check-dist.ts'
import { GetPublishedLanguages, DirectoryPath } from '../src/lib/localization.ts'
import { LinkFixtureDependencies, ResetFixtureContent } from './fixtures.ts'

const Root = resolve(import.meta.dirname, '..')
const TsxCli = fileURLToPath(import.meta.resolve('tsx/cli'))
const FontStylesheet = 'https://cdn.jsdelivr.net/npm/@fontsource-variable/google-sans-flex@5.3.1/index.min.css'

function AssertFontStylesheet(Html: string) {
  const Head = Html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/)?.[1] ?? ''
  const Links = Head.match(/<link\b[^>]*>/g) ?? []
  assert.equal(Links.filter((Link) => Link.includes(`href="${FontStylesheet}"`) && /\brel="stylesheet"/.test(Link)).length, 1,
    'Every page must load the pinned font stylesheet once in its head.')
}

test('CSP permits only the pinned external font resources alongside local assets', async () => {
  const Headers = await readFile(join(Root, 'public/_headers'), 'utf8')
  const Policy = Headers.match(/^\s*Content-Security-Policy: (.+)$/m)?.[1]
  assert(Policy, 'Security headers must include a CSP.')
  const Directives = Object.fromEntries(Policy.split(';').map((Directive): [string, string[]] => {
    const [Name, ...Sources] = Directive.trim().split(/\s+/)
    return [Name ?? '', Sources]
  }))
  assert.deepEqual(Directives, {
    'default-src': ['\'none\''],
    'script-src': ['\'none\''],
    'style-src': ['\'self\'', FontStylesheet],
    'img-src': ['\'self\''],
    'font-src': ['\'self\'', 'https://cdn.jsdelivr.net/npm/@fontsource-variable/google-sans-flex@5.3.1/files/'],
    'connect-src': ['\'none\''],
    'object-src': ['\'none\''],
    'base-uri': ['\'none\''],
    'form-action': ['\'none\''],
    'frame-ancestors': ['\'none\''],
  })
})

const ServerFixture = [
  '---',
  'slug: fixture',
  'name: Fixture server',
  'description: Synthetic offline test only.',
  'capabilities: [mcp, api]',
  'codex:',
  '  format: toml',
  '  config: |',
  '    [mcp_servers.fixture]',
  '    url = "https://example.org/mcp"',
  '    # Display literal markup safely: <script>example</script>',
  'claude:',
  '  client: Claude Code',
  '  format: json',
  '  config: |',
  '    {"mcpServers":{"fixture":{"type":"http","url":"https://example.org/mcp"}}}',
  '---',
  '### Getting started',
  '',
  'Follow the [fixture documentation](https://example.org/docs).',
  '',
  '~~~sh',
  'client --url https://example.org/mcp',
  '~~~',
  '',
].join('\n')

test('static builds handle empty and populated catalogs, plugins, policies, and unsafe Markdown', { timeout: 120_000 }, async () => {
  const Fixture = await mkdtemp(join(tmpdir(), 'publicdata-build-'))
  try {
    for (const Path of ['src', 'public', 'astro.config.ts', 'tsconfig.json', 'package.json']) {
      await cp(join(Root, Path), join(Fixture, Path), { recursive: true })
    }
    await LinkFixtureDependencies(Fixture)
    // Discard copied production entries before adding synthetic offline fixtures.
    await ResetFixtureContent(Fixture)
    const Directories = GetPublishedLanguages().map(({ Code }) => DirectoryPath(Code))
    const EmptyPageCount = Directories.length + 1
    const Build = () => execFileSync(process.execPath, [join(Root, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', Fixture], {
      cwd: Fixture,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      stdio: 'pipe',
      timeout: 30_000,
    })
    const CheckOutput = () => spawnSync(process.execPath, [TsxCli, join(Root, 'scripts/check-dist.ts')], {
      cwd: Fixture,
      encoding: 'utf8',
      timeout: 10_000,
    })
    Build()
    assert.match(await readFile(join(Fixture, 'dist/index.html'), 'utf8'), /No servers listed yet/)
    for (const Path of [...Directories.map((Directory) => `${Directory.slice(1)}index.html`), '404.html']) {
      AssertFontStylesheet(await readFile(join(Fixture, 'dist', Path), 'utf8'))
    }
    assert.equal(await CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), EmptyPageCount)
    const ValidOutput = CheckOutput()
    assert.ifError(ValidOutput.error)
    assert.equal(ValidOutput.status, 0, ValidOutput.stderr)
    assert(ValidOutput.stdout.startsWith(`Static output verified: ${EmptyPageCount} HTML pages;`))
    const ReadOutput = (Path: string) => readFile(join(Fixture, 'dist', Path), 'utf8')
    assert.match(await ReadOutput('llms.txt'), /No servers listed yet/)
    assert.match(await ReadOutput('index.md'), /No servers listed yet/)
    assert.deepEqual([...((await ReadOutput('sitemap.xml')).matchAll(/<loc>(.*?)<\/loc>/g))].map(([, Url]) => Url),
      Directories.map((Directory) => `https://publicdata.stream${Directory}`).sort())
    assert.equal(await ReadOutput('robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://publicdata.stream/sitemap.xml\n')
    assert.match(await ReadOutput('index.html'), /rel="alternate" type="text\/markdown" href="\/index.md"/)
    assert(!/rel="alternate"|rel="describedby"/.test(await ReadOutput('404.html')))

    // The deploy-time guard must detect stale or broken discovery artifacts.
    const Sitemap = await ReadOutput('sitemap.xml')
    await writeFile(join(Fixture, 'dist/sitemap.xml'), Sitemap.replace('</urlset>', '<url><loc>https://publicdata.stream/404/</loc></url>\n</urlset>'))
    await assert.rejects(CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), /Sitemap must cover/)
    const InvalidOutput = CheckOutput()
    assert.ifError(InvalidOutput.error)
    assert.equal(InvalidOutput.status, 1)
    assert.match(InvalidOutput.stderr, /Sitemap must cover/)
    assert.equal(InvalidOutput.stdout, '')
    await writeFile(join(Fixture, 'dist/sitemap.xml'), Sitemap)
    const DirectoryMarkdown = await ReadOutput('index.md')
    await rm(join(Fixture, 'dist/index.md'))
    await assert.rejects(CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), /Markdown counterpart/)
    await writeFile(join(Fixture, 'dist/index.md'), DirectoryMarkdown)
    const Llms = await ReadOutput('llms.txt')
    await writeFile(join(Fixture, 'dist/llms.txt'), Llms.replace('/index.md', '/missing.md'))
    await assert.rejects(CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), /llms.txt must link/)
    await writeFile(join(Fixture, 'dist/llms.txt'), Llms)

    const ServerFile = join(Fixture, 'src/content/servers/fixture.md')
    await writeFile(ServerFile, ServerFixture)
    Build()
    const Page = await readFile(join(Fixture, 'dist/servers/fixture/index.html'), 'utf8')
    AssertFontStylesheet(Page)
    assert.match(Page, /Fixture server/)
    assert.match(Page, /Codex/)
    assert.match(Page, /Claude Code/)
    assert(!Page.includes('<script>example</script>'))
    assert.match(Page, /(?:&lt;|&#60;)script/)
    assert(!Page.includes('ChatGPT plugin'))
    assert(!Page.includes('Terms of Service'))
    assert(!Page.includes('Privacy Policy'))
    assert.equal(await CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), EmptyPageCount + 1)
    const ServerMarkdown = await ReadOutput('servers/fixture/index.md')
    assert.match(ServerMarkdown, /### Getting started/)
    assert.match(ServerMarkdown, /### Codex/)
    assert.match(ServerMarkdown, /### Claude Code/)
    assert(ServerMarkdown.includes('<script>example</script>'))
    assert(!ServerMarkdown.startsWith('---'))
    assert(!ServerMarkdown.includes('ChatGPT plugin'))
    assert(!ServerMarkdown.includes('## Policies'))
    assert.match(await ReadOutput('llms.txt'), /https:\/\/publicdata.stream\/servers\/fixture\/index.md/)

    const Populated = ServerFixture.replace('capabilities: [mcp, api]', [
  'capabilities: [mcp, api]',
  'chatgptPlugin:',
  '  definitionUrl: https://example.org/plugin',
  '  instructions: This plugin is a synthetic fixture, not a listing.',
  'terms: fixture-terms',
  'privacy: fixture-privacy',
].join('\n'))
    await writeFile(ServerFile, Populated)
    await writeFile(join(Fixture, 'src/content/servers/offline-api.md'), [
  '---',
  'slug: offline-api',
  'name: Offline API fixture',
  'description: Synthetic unsupported-client fixture.',
  'capabilities: [api]',
  'codex:',
  '  unsupported: This API has no MCP transport.',
  'claude:',
  '  client: Claude Desktop',
  '  unsupported: This API has no MCP transport.',
  '---',
  'Offline documentation only.',
  '',
].join('\n'))
    for (const Kind of ['terms', 'privacy']) {
      await writeFile(join(Fixture, `src/content/policies/fixture-${Kind}.md`), `---
slug: fixture-${Kind}
server: fixture
kind: ${Kind}
title: Fixture ${Kind}
---
Synthetic policy fixture; not legal text.
`)
    }
    Build()
    const WithPlugin = await readFile(join(Fixture, 'dist/servers/fixture/index.html'), 'utf8')
    assert.match(WithPlugin, /ChatGPT plugin/)
    assert.match(WithPlugin, /https:\/\/example.org\/plugin/)
    assert.match(WithPlugin, /href="\/servers\/fixture\/terms\/"/)
    assert.match(WithPlugin, /href="\/servers\/fixture\/privacy\/"/)
    assert.equal(await CheckDist(join(Fixture, 'dist'), join(Fixture, 'public/_headers')), EmptyPageCount + 4)
    const PluginMarkdown = await ReadOutput('servers/fixture/index.md')
    assert.match(PluginMarkdown, /## ChatGPT plugin/)
    assert.match(PluginMarkdown, /https:\/\/example.org\/plugin/)
    assert.match(PluginMarkdown, /https:\/\/publicdata.stream\/servers\/fixture\/terms\/index.md/)
    assert.match(PluginMarkdown, /https:\/\/publicdata.stream\/servers\/fixture\/privacy\/index.md/)
    const UnsupportedMarkdown = await ReadOutput('servers/offline-api/index.md')
    assert.equal((UnsupportedMarkdown.match(/This API has no MCP transport/g) ?? []).length, 2)
    assert.match(UnsupportedMarkdown, /### Claude Desktop/)
    assert.match(await ReadOutput('llms.txt'), /## Optional/)
    for (const Kind of ['terms', 'privacy']) {
      AssertFontStylesheet(await readFile(join(Fixture, `dist/servers/fixture/${Kind}/index.html`), 'utf8'))
      assert.match(await ReadOutput(`servers/fixture/${Kind}/index.md`), /Synthetic policy fixture/)
    }

    // Exercise the actual Astro Markdown pipeline, not only the standalone plugin.
    await writeFile(ServerFile, `${Populated}\n[unsafe](javascript:alert)\n`)
    assert.throws(Build, /Command failed/)
  } finally {
    await rm(Fixture, { recursive: true, force: true })
  }
})
