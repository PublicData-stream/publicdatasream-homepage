import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import assert from 'node:assert/strict';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { isAllowedContentLink } from '../src/lib/safety.ts';
import { validateMarkdown } from '../src/lib/discovery.ts';

function decodeEntities(value) {
  return value.replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(Number.parseInt(hex || decimal, hex ? 16 : 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function linkTags(html, relation) {
  return (html.match(/<link\b[^>]*>/g) ?? []).filter((tag) => tag.includes(`rel="${relation}"`));
}

function linkHref(tag) {
  return decodeEntities(tag?.match(/\bhref="([^"]*)"/)?.[1] ?? '');
}

export async function checkDist(directory = 'dist', headersSource = 'public/_headers') {
  const headers = await readFile(join(directory, '_headers'), 'utf8');
  assert.equal(headers, await readFile(headersSource, 'utf8'), 'Security headers must be copied unchanged.');
  await readFile(join(directory, 'index.html'));
  await readFile(join(directory, '404.html'));
  const robots = await readFile(join(directory, 'robots.txt'), 'utf8');
  const sitemapUrl = robots.match(/^Sitemap: (https:\/\/\S+)$/m)?.[1];
  assert(sitemapUrl, 'robots.txt must advertise the HTTPS sitemap.');
  const origin = new URL(sitemapUrl).origin;
  assert.equal(sitemapUrl, `${origin}/sitemap.xml`);
  assert.equal(robots, `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`);
  const canonicalPages = new Set();
  const expectedMarkdown = new Set();
  const markdownFiles = new Set();
  const forbidden = new Set(['_worker.js', '_routes.json', 'functions', 'server', 'node_modules']);
  let pages = 0;
  async function inspect(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      assert(!forbidden.has(entry.name), `Unexpected runtime output: ${entry.name}`);
      const filename = join(path, entry.name);
      if (entry.isDirectory()) { await inspect(filename); continue; }
      assert(!/\.(?:m?js|cjs|map)$/.test(entry.name), `Unexpected script or source map: ${entry.name}`);
      if (entry.name.endsWith('.md')) {
        markdownFiles.add(`/${relative(directory, filename).split(sep).join('/')}`);
        validateMarkdown(await readFile(filename, 'utf8'));
      }
      if (!entry.name.endsWith('.html')) continue;
      pages++;
      const html = await readFile(filename, 'utf8');
      assert(!/<(?:script|style)\b|\sstyle\s*=/i.test(html), `Inline or executable content violates the CSP: ${filename}`);
      const alternates = linkTags(html, 'alternate').filter((tag) => tag.includes('type="text/markdown"'));
      const descriptions = linkTags(html, 'describedby');
      if (/<meta\b[^>]*\bname="robots"[^>]*\bcontent="noindex"/.test(html)) {
        assert.equal(alternates.length, 0, 'Noindex pages must not advertise Markdown counterparts.');
        assert.equal(descriptions.length, 0);
      } else {
        const canonicals = linkTags(html, 'canonical');
        assert.equal(canonicals.length, 1);
        const canonical = linkHref(canonicals[0]);
        const url = new URL(canonical);
        assert.equal(url.origin, origin);
        const pagePath = `/${relative(directory, filename).split(sep).join('/')}`.replace(/index\.html$/, '');
        assert.equal(canonical, `${origin}${pagePath}`, 'Canonical URL must match its generated page.');
        assert(!canonicalPages.has(canonical), 'Canonical pages must be unique.');
        canonicalPages.add(canonical);
        const counterpart = `${url.pathname}index.md`;
        expectedMarkdown.add(counterpart);
        assert.equal(alternates.length, 1);
        assert.equal(new URL(linkHref(alternates[0]), canonical).href, `${origin}${counterpart}`);
        assert.equal(descriptions.length, 1);
        assert.equal(new URL(linkHref(descriptions[0]), canonical).href, `${origin}/llms.txt`);
      }
      for (const [, raw = ''] of html.matchAll(/\bhref="([^"]*)"/g)) {
        const href = decodeEntities(raw);
        assert(isAllowedContentLink(href), `Disallowed generated link in ${filename}`);
      }
    }
  }
  await inspect(directory);
  assert.deepEqual([...markdownFiles].sort(), [...expectedMarkdown].sort(), 'Every indexable page must have exactly one Markdown counterpart.');

  const sitemap = await readFile(join(directory, 'sitemap.xml'), 'utf8');
  const body = sitemap.match(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n([\s\S]*)<\/urlset>\n$/)?.[1];
  assert(body !== undefined, 'Sitemap must use the UTF-8 XML urlset format.');
  const entries = [...body.matchAll(/\s*<url><loc>([^<]*)<\/loc><\/url>\s*/g)];
  assert.equal(entries.map(([entry]) => entry).join(''), body, 'Sitemap must contain only URL entries.');
  const urls = entries.map(([, value]) => {
    assert(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(value), 'Sitemap values must be XML-escaped.');
    return decodeEntities(value);
  });
  assert.deepEqual(urls, [...canonicalPages].sort(), 'Sitemap must cover exactly the indexable HTML pages, sorted without duplicates.');

  const llms = validateMarkdown(await readFile(join(directory, 'llms.txt'), 'utf8'));
  assert(llms.startsWith('# publicdata.stream\n'), 'llms.txt must name the site.');
  const llmsTree = unified().use(remarkParse).parse(llms);
  const destinations = [];
  function inspectLlms(node) {
    if (node.type === 'link') {
      const url = new URL(node.url);
      assert.equal(url.origin, origin);
      assert.equal(url.search, '');
      assert.equal(url.hash, '');
      destinations.push(url.pathname);
    }
    if ('children' in node) node.children.forEach(inspectLlms);
  }
  inspectLlms(llmsTree);
  assert.deepEqual(destinations.sort(), [...expectedMarkdown].sort(), 'llms.txt must link once to each published Markdown document.');
  return pages;
}

if (import.meta.main) {
  const pages = await checkDist();
  console.log(`Static output verified: ${pages} HTML pages; security headers present; no runtime bundle.`);
}
