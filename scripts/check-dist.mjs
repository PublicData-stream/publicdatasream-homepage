import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { isAllowedContentLink } from '../src/lib/safety.ts';

export async function checkDist(directory = 'dist', headersSource = 'public/_headers') {
  const headers = await readFile(join(directory, '_headers'), 'utf8');
  assert.equal(headers, await readFile(headersSource, 'utf8'), 'Security headers must be copied unchanged.');
  await readFile(join(directory, 'index.html'));
  await readFile(join(directory, '404.html'));
  const forbidden = new Set(['_worker.js', '_routes.json', 'functions', 'server', 'node_modules']);
  let pages = 0;
  async function inspect(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      assert(!forbidden.has(entry.name), `Unexpected runtime output: ${entry.name}`);
      const filename = join(path, entry.name);
      if (entry.isDirectory()) { await inspect(filename); continue; }
      assert(!/\.(?:m?js|cjs|map)$/.test(entry.name), `Unexpected script or source map: ${entry.name}`);
      if (!entry.name.endsWith('.html')) continue;
      pages++;
      const html = await readFile(filename, 'utf8');
      assert(!/<(?:script|style)\b|\sstyle\s*=/i.test(html), `Inline or executable content violates the CSP: ${filename}`);
      for (const [, raw = ''] of html.matchAll(/\bhref="([^"]*)"/g)) {
        const href = raw.replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(Number.parseInt(hex || decimal, hex ? 16 : 10)))
          .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        assert(isAllowedContentLink(href), `Disallowed generated link in ${filename}`);
      }
    }
  }
  await inspect(directory);
  return pages;
}

if (import.meta.main) {
  const pages = await checkDist();
  console.log(`Static output verified: ${pages} HTML pages; security headers present; no runtime bundle.`);
}
