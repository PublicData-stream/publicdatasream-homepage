import type { CollectionEntry } from 'astro:content'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { VFile } from 'vfile'
import ContentSafety from './content-safety.ts'
import { IsAllowedHttpsUrl } from './safety.ts'

type ServerDocument = Pick<CollectionEntry<'servers'>, 'data' | 'body'>;
type PolicyDocument = Pick<CollectionEntry<'policies'>, 'data' | 'body'>;
export interface DiscoveryCatalog {
  Servers: ServerDocument[];
  Policies: PolicyDocument[];
}

const MarkdownProcessor = unified().use(remarkParse).use(ContentSafety)
const Summary = 'Discover publicdata.stream MCP and API servers, installation instructions, and client configuration.'

export function CanonicalUrl(Path: string, Site: URL | undefined): string {
  if (!Site || !IsAllowedHttpsUrl(Site.href)) throw new Error('Discovery files require an HTTPS Astro site URL.')
  return new URL(Path, Site).href
}

export function MarkdownPath(PagePath: string): string {
  return `${PagePath}index.md`
}

export function ServerPath(Slug: string): string {
  return `/servers/${Slug}/`
}

export function PolicyPath(Policy: PolicyDocument): string {
  return `${ServerPath(Policy.data.server)}${Policy.data.kind}/`
}

function EscapeMarkdown(Value: string): string {
  return Value.replace(/[\\`*_{}[\]()#+.!<>|~-]/g, '\\$&')
}

function InlineText(Value: string): string {
  return EscapeMarkdown(Value.replace(/\s+/gu, ' ').trim())
}

function Link(Label: string, Path: string, Site: URL | undefined): string {
  return `[${InlineText(Label)}](<${CanonicalUrl(Path, Site)}>)`
}

/** Apply the same source-Markdown guard before publishing plain-text documents. */
export function ValidateMarkdown(Markdown: string): string {
  const File = new VFile({ value: Markdown })
  MarkdownProcessor.runSync(MarkdownProcessor.parse(File), File)
  return Markdown
}

function Document(Parts: string[]): string {
  return ValidateMarkdown(`${Parts.join('\n\n')}\n`)
}

export function RenderLlms(Catalog: DiscoveryCatalog, Site: URL | undefined): string {
  const Parts = ['# publicdata.stream', `> ${Summary}`]
  if (Catalog.Servers.length === 0) Parts.push('No servers listed yet. Server documentation will appear here as it is added.')
  Parts.push('## Directory', `- ${Link('Server directory', '/index.md', Site)}: Overview and current server listings.`)
  if (Catalog.Servers.length) {
    Parts.push('## Servers', Catalog.Servers.map(({ data: Data }) =>
      `- ${Link(Data.name, MarkdownPath(ServerPath(Data.slug)), Site)}: ${InlineText(Data.description)}`).join('\n'))
  }
  if (Catalog.Policies.length) {
    Parts.push('## Optional', [...Catalog.Policies].sort((A, B) => PolicyPath(A).localeCompare(PolicyPath(B), 'en')).map((Policy) =>
      `- ${Link(Policy.data.title, MarkdownPath(PolicyPath(Policy)), Site)}`).join('\n'))
  }
  return Document(Parts)
}

export function RenderRobots(Site: URL | undefined): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${CanonicalUrl('/sitemap.xml', Site)}\n`
}

function EscapeXml(Value: string): string {
  return Value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export function RenderSitemap(Catalog: DiscoveryCatalog, Site: URL | undefined): string {
  const Paths = ['/', ...Catalog.Servers.map(({ data: Data }) => ServerPath(Data.slug)), ...Catalog.Policies.map(PolicyPath)]
  const Urls = [...new Set(Paths.map((Path) => CanonicalUrl(Path, Site)))].sort()
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Urls.map((Url) => `  <url><loc>${EscapeXml(Url)}</loc></url>`).join('\n')}\n</urlset>\n`
}

export function RenderDirectoryMarkdown(Catalog: DiscoveryCatalog, Site: URL | undefined): string {
  return Document([
    '# publicdata.stream', Summary,
    'This directory brings service documentation together in one place: what each server does, how to connect, and where to find its terms and privacy policy.',
    '## Server directory',
    Catalog.Servers.length ? Catalog.Servers.map(({ data: Data }) =>
      `- ${Link(Data.name, MarkdownPath(ServerPath(Data.slug)), Site)} (${Data.capabilities.map((Capability) => Capability.toUpperCase()).join(', ')}): ${InlineText(Data.description)}`).join('\n')
      : 'No servers listed yet. Server documentation will appear here as it is added.',
  ])
}

function ClientMarkdown(Title: string, Example: ServerDocument['data']['codex']): string {
  const Heading = `### ${InlineText(Title)}`
  if ('unsupported' in Example) return `${Heading}\n\n${InlineText(Example.unsupported)}`
  const Runs = [...Example.config.matchAll(/`+/g)].map(([Run]) => Run.length)
  const Fence = '`'.repeat(Math.max(3, ...Runs.map((Length) => Length + 1)))
  return `${Heading}\n\n${Fence}${Example.format}\n${Example.config.replace(/\n?$/, '\n')}${Fence}`
}

export function RenderServerMarkdown(Server: ServerDocument, Site: URL | undefined): string {
  const { data: Data } = Server
  const Parts = [
    `# ${InlineText(Data.name)}`, InlineText(Data.description),
    `Capabilities: ${Data.capabilities.map((Capability) => Capability.toUpperCase()).join(', ')}`,
    Link('Server directory', '/index.md', Site),
    '## Installation & configuration', Server.body?.trim() ?? '',
    '## Client configuration', ClientMarkdown('Codex', Data.codex), ClientMarkdown(Data.claude.client, Data.claude),
  ]
  if (Data.chatgptPlugin) {
    Parts.push('## ChatGPT plugin', Data.chatgptPlugin.instructions.split('\n').map((Line) => EscapeMarkdown(Line.trim())).join('  \n'),
      Link('Plugin definition & documentation', Data.chatgptPlugin.definitionUrl, Site))
  }
  const Policies = (['terms', 'privacy'] as const).filter((Kind) => Data[Kind]).map((Kind) =>
    `- ${Link(Kind === 'terms' ? 'Terms of Service' : 'Privacy Policy', MarkdownPath(`${ServerPath(Data.slug)}${Kind}/`), Site)}`)
  if (Policies.length) Parts.push('## Policies', Policies.join('\n'))
  return Document(Parts)
}

export function RenderPolicyMarkdown(Policy: PolicyDocument, Site: URL | undefined): string {
  return Document([`# ${InlineText(Policy.data.title)}`, Link('Server documentation', MarkdownPath(ServerPath(Policy.data.server)), Site), Policy.body?.trim() ?? ''])
}
