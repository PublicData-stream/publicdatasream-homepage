import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Root, RootContent } from 'mdast'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { ServerSchema } from '../src/lib/content-schema.ts'
import {
  CanonicalUrl, RenderDirectoryMarkdown, RenderLlms, RenderPolicyMarkdown,
  RenderRobots, RenderServerMarkdown, RenderSitemap, type DiscoveryCatalog,
} from '../src/lib/discovery.ts'

const Site = new URL('https://example.org')
const Server = {
  data: ServerSchema.parse({
    slug: 'fixture', name: 'Fixture server', description: 'Offline synthetic documentation.', capabilities: ['mcp'],
    codex: { format: 'text', config: 'literal ``` and ````\n<script>example</script>\nAPI_KEY="<YOUR_API_KEY>"' },
    claude: { client: 'Claude Desktop', unsupported: 'No supported integration.' },
  }),
  body: '### Setup\n\nRead [local docs](/#about) and [external docs](https://example.org/docs).\n',
}

function Nodes(Markdown: string): (Root | RootContent)[] {
  const Result: (Root | RootContent)[] = []
  function Visit(Node: Root | RootContent) {
    Result.push(Node)
    if ('children' in Node) Node.children.forEach(Visit)
  }
  Visit(unified().use(remarkParse).parse(Markdown))
  return Result
}

test('empty discovery documents accurately describe the directory and use the configured origin', () => {
  const Catalog: DiscoveryCatalog = { Servers: [], Policies: [] }
  assert.match(RenderDirectoryMarkdown(Catalog, Site), /No servers listed yet/)
  const Index = RenderLlms(Catalog, Site)
  assert.match(Index, /No servers listed yet/)
  assert(!Index.includes('## Servers'))
  assert(!Index.includes('## Optional'))
  assert.deepEqual(Nodes(Index).filter((Node) => Node.type === 'link').map((Node) => Node.url),
    ['https://example.org/index.md', 'https://example.org/ko/index.md'])
  assert.equal(RenderRobots(Site), 'User-agent: *\nAllow: /\n\nSitemap: https://example.org/sitemap.xml\n')
  assert.equal((RenderSitemap(Catalog, Site).match(/<loc>/g) ?? []).length, 2)
  assert.throws(() => CanonicalUrl('/', undefined), /HTTPS Astro site/)
  assert.throws(() => RenderRobots(new URL('http://example.org')), /HTTPS Astro site/)
})

test('Markdown retains client code verbatim, unsupported explanations, authored links, and optional content', () => {
  const Policy = { data: { language: 'en', slug: 'fixture-terms', server: 'fixture', kind: 'terms' as const, title: 'Fixture Terms' }, body: 'Synthetic approved fixture body.' }
  const Populated = { ...Server, data: { ...Server.data, terms: Policy.data.slug,
    chatgptPlugin: { definitionUrl: 'https://example.org/plugin', instructions: 'First line\nSecond line [literal] <markup>' } } }
  const Markdown = RenderServerMarkdown(Populated, Site)
  const Tree = Nodes(Markdown)
  const Examples = Tree.filter((Node) => Node.type === 'code')
  assert.equal(Examples.length, 1)
  assert('config' in Server.data.codex)
  assert.equal(Examples[0]?.value, Server.data.codex.config)
  assert.match(Markdown, /No supported integration/)
  assert(Markdown.includes(Server.body.trim()))
  assert(!Tree.some((Node) => Node.type === 'html'))
  const Destinations = Tree.filter((Node) => Node.type === 'link').map((Node) => Node.url)
  assert(Destinations.includes('/#about'))
  assert(Destinations.includes('https://example.org/plugin'))
  assert(Destinations.includes('https://example.org/servers/fixture/terms/index.md'))
  assert(!Destinations.some((Url) => Url.includes('privacy')))
  assert(RenderPolicyMarkdown(Policy, Site).includes(Policy.body))
  const Index = RenderLlms({ Servers: [Populated], Policies: [Policy] }, Site)
  assert.match(Index, /## Optional/)
  assert(!Index.includes('No servers listed yet'))
})

test('Unicode, punctuation, and multiline metadata remain text rather than injected Markdown', () => {
  const Tricky = { ...Server, data: { ...Server.data,
    name: '資料 [brackets] *stars*\n<script>markup</script>',
    description: 'First line\n## Fake section\n[unsafe](javascript:alert)',
  } }
  const IndexTree = Nodes(RenderLlms({ Servers: [Tricky], Policies: [] }, Site))
  assert.equal(IndexTree.filter((Node) => Node.type === 'link').length, 3)
  assert(!IndexTree.some((Node) => Node.type === 'html'))
  assert.equal(IndexTree.filter((Node) => Node.type === 'heading').length, 6)
  const Heading = Nodes(RenderServerMarkdown(Tricky, Site)).find((Node) => Node.type === 'heading')
  assert(Heading?.type === 'heading')
  assert.equal(Heading.children.length, 1)
  assert.equal(Heading.children[0]?.type, 'text')
  assert.equal(Heading.children[0]?.type === 'text' && Heading.children[0].value, '資料 [brackets] *stars* <script>markup</script>')
})

test('Markdown serializers reject unsafe bodies and credential examples without relying on HTML generation', () => {
  for (const Body of ['[unsafe](javascript:alert)', '<div>raw HTML</div>', '```sh\ntoken="fictional-literal"\n```']) {
    assert.throws(() => RenderServerMarkdown({ ...Server, body: Body }, Site))
    assert.throws(() => RenderPolicyMarkdown({ data: { language: 'en', slug: 'terms', server: 'fixture', kind: 'terms', title: 'Terms' }, body: Body }, Site))
  }
  assert.throws(() => RenderServerMarkdown({ ...Server, data: { ...Server.data, codex: { format: 'sh', config: 'token="fictional-literal"' } } }, Site), /credentials/)
})

test('sitemap URLs are sorted, deduplicated, escaped, and limited to HTML pages', () => {
  const Catalog = { Servers: [Server, Server], Policies: [
    { data: { language: 'en', slug: 'privacy', server: 'fixture', kind: 'privacy' as const, title: 'Privacy' }, body: 'Fixture policy.' },
  ] }
  const Sitemap = RenderSitemap(Catalog, Site)
  assert.deepEqual([...Sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, Url]) => Url), [
    'https://example.org/', 'https://example.org/ko/', 'https://example.org/servers/fixture/', 'https://example.org/servers/fixture/privacy/',
  ])
  assert(!/404|index\.md|llms|robots|lastmod|priority|changefreq/.test(Sitemap))
  assert.match(RenderSitemap({ Servers: [{ ...Server, data: { ...Server.data, slug: 'fixture&other' } }], Policies: [] }, Site), /fixture&amp;other/)
})
