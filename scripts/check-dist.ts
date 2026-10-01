import { readFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import assert from 'node:assert/strict'
import type { Nodes } from 'mdast'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { IsAllowedContentLink } from '../src/lib/safety.ts'
import { ValidateMarkdown } from '../src/lib/discovery.ts'

function DecodeEntities(Value: string): string {
  return Value.replace(/&#(?:x([\da-f]+)|(\d+));/gi, (...[, Hex, Decimal]: [string, string | undefined, string | undefined]) =>
    String.fromCodePoint(Number.parseInt(Hex ?? Decimal ?? '', Hex ? 16 : 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function LinkTags(Html: string, Relation: string): string[] {
  return (Html.match(/<link\b[^>]*>/g) ?? []).filter((Tag) => Tag.includes(`rel="${Relation}"`))
}

function LinkHref(Tag: string | undefined): string {
  return DecodeEntities(Tag?.match(/\bhref="([^"]*)"/)?.[1] ?? '')
}

export async function CheckDist(Directory = 'dist', HeadersSource = 'public/_headers'): Promise<number> {
  const Headers = await readFile(join(Directory, '_headers'), 'utf8')
  assert.equal(Headers, await readFile(HeadersSource, 'utf8'), 'Security headers must be copied unchanged.')
  await readFile(join(Directory, 'index.html'))
  await readFile(join(Directory, '404.html'))
  const Robots = await readFile(join(Directory, 'robots.txt'), 'utf8')
  const SitemapUrl = Robots.match(/^Sitemap: (https:\/\/\S+)$/m)?.[1]
  assert(SitemapUrl, 'robots.txt must advertise the HTTPS sitemap.')
  const Origin = new URL(SitemapUrl).origin
  assert.equal(SitemapUrl, `${Origin}/sitemap.xml`)
  assert.equal(Robots, `User-agent: *\nAllow: /\n\nSitemap: ${SitemapUrl}\n`)
  const CanonicalPages = new Set<string>()
  const ExpectedMarkdown = new Set<string>()
  const MarkdownFiles = new Set<string>()
  const Forbidden = new Set(['_worker.js', '_routes.json', 'functions', 'server', 'node_modules'])
  let Pages = 0
  async function Inspect(Path: string): Promise<void> {
    for (const Entry of await readdir(Path, { withFileTypes: true })) {
      assert(!Forbidden.has(Entry.name), `Unexpected runtime output: ${Entry.name}`)
      const Filename = join(Path, Entry.name)
      if (Entry.isDirectory()) { await Inspect(Filename); continue }
      assert(!/\.(?:m?js|cjs|map)$/.test(Entry.name), `Unexpected script or source map: ${Entry.name}`)
      if (Entry.name.endsWith('.md')) {
        MarkdownFiles.add(`/${relative(Directory, Filename).split(sep).join('/')}`)
        ValidateMarkdown(await readFile(Filename, 'utf8'))
      }
      if (!Entry.name.endsWith('.html')) continue
      Pages++
      const Html = await readFile(Filename, 'utf8')
      assert(!/<(?:script|style)\b|\sstyle\s*=/i.test(Html), `Inline or executable content violates the CSP: ${Filename}`)
      const Alternates = LinkTags(Html, 'alternate').filter((Tag) => Tag.includes('type="text/markdown"'))
      const Descriptions = LinkTags(Html, 'describedby')
      if (/<meta\b[^>]*\bname="robots"[^>]*\bcontent="noindex"/.test(Html)) {
        assert.equal(Alternates.length, 0, 'Noindex pages must not advertise Markdown counterparts.')
        assert.equal(Descriptions.length, 0)
      } else {
        const Canonicals = LinkTags(Html, 'canonical')
        assert.equal(Canonicals.length, 1)
        const Canonical = LinkHref(Canonicals[0])
        const Url = new URL(Canonical)
        assert.equal(Url.origin, Origin)
        const PagePath = `/${relative(Directory, Filename).split(sep).join('/')}`.replace(/index\.html$/, '')
        assert.equal(Canonical, `${Origin}${PagePath}`, 'Canonical URL must match its generated page.')
        assert(!CanonicalPages.has(Canonical), 'Canonical pages must be unique.')
        CanonicalPages.add(Canonical)
        const Counterpart = `${Url.pathname}index.md`
        ExpectedMarkdown.add(Counterpart)
        assert.equal(Alternates.length, 1)
        assert.equal(new URL(LinkHref(Alternates[0]), Canonical).href, `${Origin}${Counterpart}`)
        assert.equal(Descriptions.length, 1)
        assert.equal(new URL(LinkHref(Descriptions[0]), Canonical).href, `${Origin}/llms.txt`)
      }
      for (const [, Raw = ''] of Html.matchAll(/\bhref="([^"]*)"/g)) {
        const Href = DecodeEntities(Raw)
        assert(IsAllowedContentLink(Href), `Disallowed generated link in ${Filename}`)
      }
    }
  }
  await Inspect(Directory)
  assert.deepEqual([...MarkdownFiles].sort(), [...ExpectedMarkdown].sort(), 'Every indexable page must have exactly one Markdown counterpart.')

  const Sitemap = await readFile(join(Directory, 'sitemap.xml'), 'utf8')
  const Body = Sitemap.match(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n([\s\S]*)<\/urlset>\n$/)?.[1]
  assert(Body !== undefined, 'Sitemap must use the UTF-8 XML urlset format.')
  const Entries = [...Body.matchAll(/\s*<url><loc>([^<]*)<\/loc><\/url>\s*/g)]
  assert.equal(Entries.map(([Entry]) => Entry).join(''), Body, 'Sitemap must contain only URL entries.')
  const Urls = Entries.map(([, Value = '']) => {
    assert(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(Value), 'Sitemap values must be XML-escaped.')
    return DecodeEntities(Value)
  })
  assert.deepEqual(Urls, [...CanonicalPages].sort(), 'Sitemap must cover exactly the indexable HTML pages, sorted without duplicates.')

  const Llms = ValidateMarkdown(await readFile(join(Directory, 'llms.txt'), 'utf8'))
  assert(Llms.startsWith('# publicdata.stream\n'), 'llms.txt must name the site.')
  const LlmsTree = unified().use(remarkParse).parse(Llms)
  const Destinations: string[] = []
  function InspectLlms(Node: Nodes): void {
    if (Node.type === 'link') {
      const Url = new URL(Node.url)
      assert.equal(Url.origin, Origin)
      assert.equal(Url.search, '')
      assert.equal(Url.hash, '')
      Destinations.push(Url.pathname)
    }
    if ('children' in Node) Node.children.forEach(InspectLlms)
  }
  InspectLlms(LlmsTree)
  assert.deepEqual(Destinations.sort(), [...ExpectedMarkdown].sort(), 'llms.txt must link once to each published Markdown document.')
  return Pages
}

if (import.meta.main) {
  const Pages = await CheckDist()
  console.log(`Static output verified: ${Pages} HTML pages; security headers present; no runtime bundle.`)
}
