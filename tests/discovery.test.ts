import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Root, RootContent } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { serverSchema } from '../src/lib/content-schema.ts';
import {
  canonicalUrl, renderDirectoryMarkdown, renderLlms, renderPolicyMarkdown,
  renderRobots, renderServerMarkdown, renderSitemap, type DiscoveryCatalog,
} from '../src/lib/discovery.ts';

const site = new URL('https://example.org');
const server = {
  data: serverSchema.parse({
    slug: 'fixture', name: 'Fixture server', description: 'Offline synthetic documentation.', capabilities: ['mcp'],
    codex: { format: 'text', config: 'literal ``` and ````\n<script>example</script>\nAPI_KEY="<YOUR_API_KEY>"' },
    claude: { client: 'Claude Desktop', unsupported: 'No supported integration.' },
  }),
  body: '### Setup\n\nRead [local docs](/#about) and [external docs](https://example.org/docs).\n',
};

function nodes(markdown: string): (Root | RootContent)[] {
  const result: (Root | RootContent)[] = [];
  function visit(node: Root | RootContent) {
    result.push(node);
    if ('children' in node) node.children.forEach(visit);
  }
  visit(unified().use(remarkParse).parse(markdown));
  return result;
}

test('empty discovery documents accurately describe the directory and use the configured origin', () => {
  const catalog: DiscoveryCatalog = { servers: [], policies: [] };
  assert.match(renderDirectoryMarkdown(catalog, site), /No servers listed yet/);
  const index = renderLlms(catalog, site);
  assert.match(index, /No servers listed yet/);
  assert(!index.includes('## Servers'));
  assert(!index.includes('## Optional'));
  assert.deepEqual(nodes(index).filter((node) => node.type === 'link').map((node) => node.url), ['https://example.org/index.md']);
  assert.equal(renderRobots(site), 'User-agent: *\nAllow: /\n\nSitemap: https://example.org/sitemap.xml\n');
  assert.equal((renderSitemap(catalog, site).match(/<loc>/g) ?? []).length, 1);
  assert.throws(() => canonicalUrl('/', undefined), /HTTPS Astro site/);
  assert.throws(() => renderRobots(new URL('http://example.org')), /HTTPS Astro site/);
});

test('Markdown retains client code verbatim, unsupported explanations, authored links, and optional content', () => {
  const policy = { data: { slug: 'fixture-terms', server: 'fixture', kind: 'terms' as const, title: 'Fixture Terms' }, body: 'Synthetic approved fixture body.' };
  const populated = { ...server, data: { ...server.data, terms: policy.data.slug,
    chatgptPlugin: { definitionUrl: 'https://example.org/plugin', instructions: 'First line\nSecond line [literal] <markup>' } } };
  const markdown = renderServerMarkdown(populated, site);
  const tree = nodes(markdown);
  const examples = tree.filter((node) => node.type === 'code');
  assert.equal(examples.length, 1);
  assert('config' in server.data.codex);
  assert.equal(examples[0]?.value, server.data.codex.config);
  assert.match(markdown, /No supported integration/);
  assert(markdown.includes(server.body.trim()));
  assert(!tree.some((node) => node.type === 'html'));
  const destinations = tree.filter((node) => node.type === 'link').map((node) => node.url);
  assert(destinations.includes('/#about'));
  assert(destinations.includes('https://example.org/plugin'));
  assert(destinations.includes('https://example.org/servers/fixture/terms/index.md'));
  assert(!destinations.some((url) => url.includes('privacy')));
  assert(renderPolicyMarkdown(policy, site).includes(policy.body));
  const index = renderLlms({ servers: [populated], policies: [policy] }, site);
  assert.match(index, /## Optional/);
  assert(!index.includes('No servers listed yet'));
});

test('Unicode, punctuation, and multiline metadata remain text rather than injected Markdown', () => {
  const tricky = { ...server, data: { ...server.data,
    name: '資料 [brackets] *stars*\n<script>markup</script>',
    description: 'First line\n## Fake section\n[unsafe](javascript:alert)',
  } };
  const indexTree = nodes(renderLlms({ servers: [tricky], policies: [] }, site));
  assert.equal(indexTree.filter((node) => node.type === 'link').length, 2);
  assert(!indexTree.some((node) => node.type === 'html'));
  assert.equal(indexTree.filter((node) => node.type === 'heading').length, 3);
  const heading = nodes(renderServerMarkdown(tricky, site)).find((node) => node.type === 'heading');
  assert(heading?.type === 'heading');
  assert.equal(heading.children.length, 1);
  assert.equal(heading.children[0]?.type, 'text');
  assert.equal(heading.children[0]?.type === 'text' && heading.children[0].value, '資料 [brackets] *stars* <script>markup</script>');
});

test('Markdown serializers reject unsafe bodies and credential examples without relying on HTML generation', () => {
  for (const body of ['[unsafe](javascript:alert)', '<div>raw HTML</div>', '```sh\ntoken="fictional-literal"\n```']) {
    assert.throws(() => renderServerMarkdown({ ...server, body }, site));
    assert.throws(() => renderPolicyMarkdown({ data: { slug: 'terms', server: 'fixture', kind: 'terms', title: 'Terms' }, body }, site));
  }
  assert.throws(() => renderServerMarkdown({ ...server, data: { ...server.data, codex: { format: 'sh', config: 'token="fictional-literal"' } } }, site), /credentials/);
});

test('sitemap URLs are sorted, deduplicated, escaped, and limited to HTML pages', () => {
  const catalog = { servers: [server, server], policies: [
    { data: { slug: 'privacy', server: 'fixture', kind: 'privacy' as const, title: 'Privacy' }, body: 'Fixture policy.' },
  ] };
  const sitemap = renderSitemap(catalog, site);
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url), [
    'https://example.org/', 'https://example.org/servers/fixture/', 'https://example.org/servers/fixture/privacy/',
  ]);
  assert(!/404|index\.md|llms|robots|lastmod|priority|changefreq/.test(sitemap));
  assert.match(renderSitemap({ servers: [{ ...server, data: { ...server.data, slug: 'fixture&other' } }], policies: [] }, site), /fixture&amp;other/);
});
