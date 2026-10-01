import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkDist } from '../scripts/check-dist.ts';

const root = resolve(import.meta.dirname, '..');
const tsxCli = fileURLToPath(import.meta.resolve('tsx/cli'));
const fontStylesheet = 'https://cdn.jsdelivr.net/npm/@fontsource-variable/google-sans-flex@5.3.1/index.min.css';

function assertFontStylesheet(html: string) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/)?.[1] ?? '';
  const links = head.match(/<link\b[^>]*>/g) ?? [];
  assert.equal(links.filter((link) => link.includes(`href="${fontStylesheet}"`) && /\brel="stylesheet"/.test(link)).length, 1,
    'Every page must load the pinned font stylesheet once in its head.');
}

test('CSP permits only the pinned external font resources alongside local assets', async () => {
  const headers = await readFile(join(root, 'public/_headers'), 'utf8');
  const policy = headers.match(/^\s*Content-Security-Policy: (.+)$/m)?.[1];
  assert(policy, 'Security headers must include a CSP.');
  const directives = Object.fromEntries(policy.split(';').map((directive) => {
    const [name, ...sources] = directive.trim().split(/\s+/);
    return [name, sources];
  }));
  assert.deepEqual(directives, {
    'default-src': ["'none'"],
    'script-src': ["'none'"],
    'style-src': ["'self'", fontStylesheet],
    'img-src': ["'self'"],
    'font-src': ["'self'", 'https://cdn.jsdelivr.net/npm/@fontsource-variable/google-sans-flex@5.3.1/files/'],
    'connect-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'frame-ancestors': ["'none'"],
  });
});

const serverFixture = `---
slug: fixture
name: Fixture server
description: Synthetic offline test only.
capabilities: [mcp, api]
codex:
  format: toml
  config: |
    [mcp_servers.fixture]
    url = "https://example.org/mcp"
    # Display literal markup safely: <script>example</script>
claude:
  client: Claude Code
  format: json
  config: |
    {"mcpServers":{"fixture":{"type":"http","url":"https://example.org/mcp"}}}
---
### Getting started

Follow the [fixture documentation](https://example.org/docs).

~~~sh
client --url https://example.org/mcp
~~~
`;

test('static builds handle empty and populated catalogs, plugins, policies, and unsafe Markdown', { timeout: 120_000 }, async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'publicdata-build-'));
  try {
    for (const path of ['src', 'public', 'astro.config.ts', 'tsconfig.json', 'package.json']) {
      await cp(join(root, path), join(fixture, path), { recursive: true });
    }
    await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
    // These copies are disposable; real entries never enter the production catalog.
    await mkdir(join(fixture, 'src/content/servers'), { recursive: true });
    const build = () => execFileSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', fixture], {
      cwd: fixture,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      stdio: 'pipe',
      timeout: 30_000,
    });
    const checkOutput = () => spawnSync(process.execPath, [tsxCli, join(root, 'scripts/check-dist.ts')], {
      cwd: fixture,
      encoding: 'utf8',
      timeout: 10_000,
    });
    build();
    assert.match(await readFile(join(fixture, 'dist/index.html'), 'utf8'), /No servers listed yet/);
    for (const path of ['index.html', '404.html']) {
      assertFontStylesheet(await readFile(join(fixture, 'dist', path), 'utf8'));
    }
    assert.equal(await checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), 2);
    const validOutput = checkOutput();
    assert.ifError(validOutput.error);
    assert.equal(validOutput.status, 0, validOutput.stderr);
    assert.match(validOutput.stdout, /^Static output verified: 2 HTML pages;/);
    const readOutput = (path: string) => readFile(join(fixture, 'dist', path), 'utf8');
    assert.match(await readOutput('llms.txt'), /No servers listed yet/);
    assert.match(await readOutput('index.md'), /No servers listed yet/);
    assert.deepEqual([...((await readOutput('sitemap.xml')).matchAll(/<loc>(.*?)<\/loc>/g))].map(([, url]) => url), ['https://publicdata.stream/']);
    assert.equal(await readOutput('robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://publicdata.stream/sitemap.xml\n');
    assert.match(await readOutput('index.html'), /rel="alternate" type="text\/markdown" href="\/index.md"/);
    assert(!/rel="alternate"|rel="describedby"/.test(await readOutput('404.html')));

    // The deploy-time guard must detect stale or broken discovery artifacts.
    const sitemap = await readOutput('sitemap.xml');
    await writeFile(join(fixture, 'dist/sitemap.xml'), sitemap.replace('</urlset>', '<url><loc>https://publicdata.stream/404/</loc></url>\n</urlset>'));
    await assert.rejects(checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), /Sitemap must cover/);
    const invalidOutput = checkOutput();
    assert.ifError(invalidOutput.error);
    assert.equal(invalidOutput.status, 1);
    assert.match(invalidOutput.stderr, /Sitemap must cover/);
    assert.equal(invalidOutput.stdout, '');
    await writeFile(join(fixture, 'dist/sitemap.xml'), sitemap);
    const directoryMarkdown = await readOutput('index.md');
    await rm(join(fixture, 'dist/index.md'));
    await assert.rejects(checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), /Markdown counterpart/);
    await writeFile(join(fixture, 'dist/index.md'), directoryMarkdown);
    const llms = await readOutput('llms.txt');
    await writeFile(join(fixture, 'dist/llms.txt'), llms.replace('/index.md', '/missing.md'));
    await assert.rejects(checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), /llms.txt must link/);
    await writeFile(join(fixture, 'dist/llms.txt'), llms);

    const serverFile = join(fixture, 'src/content/servers/fixture.md');
    await writeFile(serverFile, serverFixture);
    build();
    const page = await readFile(join(fixture, 'dist/servers/fixture/index.html'), 'utf8');
    assertFontStylesheet(page);
    assert.match(page, /Fixture server/);
    assert.match(page, /Codex/);
    assert.match(page, /Claude Code/);
    assert(!page.includes('<script>example</script>'));
    assert.match(page, /(?:&lt;|&#60;)script/);
    assert(!page.includes('ChatGPT plugin'));
    assert(!page.includes('Terms of Service'));
    assert(!page.includes('Privacy Policy'));
    assert.equal(await checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), 3);
    const serverMarkdown = await readOutput('servers/fixture/index.md');
    assert.match(serverMarkdown, /### Getting started/);
    assert.match(serverMarkdown, /### Codex/);
    assert.match(serverMarkdown, /### Claude Code/);
    assert(serverMarkdown.includes('<script>example</script>'));
    assert(!serverMarkdown.startsWith('---'));
    assert(!serverMarkdown.includes('ChatGPT plugin'));
    assert(!serverMarkdown.includes('## Policies'));
    assert.match(await readOutput('llms.txt'), /https:\/\/publicdata.stream\/servers\/fixture\/index.md/);

    const populated = serverFixture.replace('capabilities: [mcp, api]', `capabilities: [mcp, api]
chatgptPlugin:
  definitionUrl: https://example.org/plugin
  instructions: This plugin is a synthetic fixture, not a listing.
terms: fixture-terms
privacy: fixture-privacy`);
    await writeFile(serverFile, populated);
    await writeFile(join(fixture, 'src/content/servers/offline-api.md'), `---
slug: offline-api
name: Offline API fixture
description: Synthetic unsupported-client fixture.
capabilities: [api]
codex:
  unsupported: This API has no MCP transport.
claude:
  client: Claude Desktop
  unsupported: This API has no MCP transport.
---
Offline documentation only.
`);
    for (const kind of ['terms', 'privacy']) {
      await writeFile(join(fixture, `src/content/policies/fixture-${kind}.md`), `---
slug: fixture-${kind}
server: fixture
kind: ${kind}
title: Fixture ${kind}
---
Synthetic policy fixture; not legal text.
`);
    }
    build();
    const withPlugin = await readFile(join(fixture, 'dist/servers/fixture/index.html'), 'utf8');
    assert.match(withPlugin, /ChatGPT plugin/);
    assert.match(withPlugin, /https:\/\/example.org\/plugin/);
    assert.match(withPlugin, /href="\/servers\/fixture\/terms\/"/);
    assert.match(withPlugin, /href="\/servers\/fixture\/privacy\/"/);
    assert.equal(await checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), 6);
    const pluginMarkdown = await readOutput('servers/fixture/index.md');
    assert.match(pluginMarkdown, /## ChatGPT plugin/);
    assert.match(pluginMarkdown, /https:\/\/example.org\/plugin/);
    assert.match(pluginMarkdown, /https:\/\/publicdata.stream\/servers\/fixture\/terms\/index.md/);
    assert.match(pluginMarkdown, /https:\/\/publicdata.stream\/servers\/fixture\/privacy\/index.md/);
    const unsupportedMarkdown = await readOutput('servers/offline-api/index.md');
    assert.equal((unsupportedMarkdown.match(/This API has no MCP transport/g) ?? []).length, 2);
    assert.match(unsupportedMarkdown, /### Claude Desktop/);
    assert.match(await readOutput('llms.txt'), /## Optional/);
    for (const kind of ['terms', 'privacy']) {
      assertFontStylesheet(await readFile(join(fixture, `dist/servers/fixture/${kind}/index.html`), 'utf8'));
      assert.match(await readOutput(`servers/fixture/${kind}/index.md`), /Synthetic policy fixture/);
    }

    // Exercise the actual Astro Markdown pipeline, not only the standalone plugin.
    await writeFile(serverFile, `${populated}\n[unsafe](javascript:alert)\n`);
    assert.throws(build, /Command failed/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
