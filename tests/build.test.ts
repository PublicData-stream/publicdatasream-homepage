import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { checkDist } from '../scripts/check-dist.mjs';

const root = resolve(import.meta.dirname, '..');
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
    build();
    assert.match(await readFile(join(fixture, 'dist/index.html'), 'utf8'), /No servers listed yet/);
    assert.equal(await checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), 2);

    const serverFile = join(fixture, 'src/content/servers/fixture.md');
    await writeFile(serverFile, serverFixture);
    build();
    const page = await readFile(join(fixture, 'dist/servers/fixture/index.html'), 'utf8');
    assert.match(page, /Fixture server/);
    assert.match(page, /Codex/);
    assert.match(page, /Claude Code/);
    assert(!page.includes('<script>example</script>'));
    assert.match(page, /(?:&lt;|&#60;)script/);
    assert(!page.includes('ChatGPT plugin'));
    assert(!page.includes('Terms of Service'));
    assert(!page.includes('Privacy Policy'));
    assert.equal(await checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), 3);

    const populated = serverFixture.replace('capabilities: [mcp, api]', `capabilities: [mcp, api]
chatgptPlugin:
  definitionUrl: https://example.org/plugin
  instructions: This plugin is a synthetic fixture, not a listing.
terms: fixture-terms
privacy: fixture-privacy`);
    await writeFile(serverFile, populated);
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
    assert.equal(await checkDist(join(fixture, 'dist'), join(fixture, 'public/_headers')), 5);

    // Exercise the actual Astro Markdown pipeline, not only the standalone plugin.
    await writeFile(serverFile, `${populated}\n[unsafe](javascript:alert)\n`);
    assert.throws(build, /Command failed/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
