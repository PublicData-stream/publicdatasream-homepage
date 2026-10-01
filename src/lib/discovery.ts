import type { CollectionEntry } from 'astro:content'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { VFile } from 'vfile'
import ContentSafety from './content-safety.ts'
import { IsAllowedHttpsUrl } from './safety.ts'
import { DefaultLanguage } from './languages.ts'
import { DirectoryPath, GetLanguage, GetPublishedLanguages, LocalizedServers, PolicyPath, ResolvePolicy, ServerPath } from './localization.ts'

export { PolicyPath, ServerPath } from './localization.ts'

type ServerDocument = Pick<CollectionEntry<'servers'>, 'data' | 'body'>;
type PolicyDocument = Pick<CollectionEntry<'policies'>, 'data' | 'body'>;
export interface DiscoveryCatalog {
  Servers: ServerDocument[];
  Policies: PolicyDocument[];
}

const MarkdownProcessor = unified().use(remarkParse).use(ContentSafety)

export function CanonicalUrl(Path: string, Site: URL | undefined): string {
  if (!Site || !IsAllowedHttpsUrl(Site.href)) throw new Error('Discovery files require an HTTPS Astro site URL.')
  return new URL(Path, Site).href
}

export function MarkdownPath(PagePath: string): string {
  return `${PagePath}index.md`
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
  const Parts = ['# publicdata.stream', `> ${GetLanguage().Messages.Summary}`]
  if (Catalog.Servers.length === 0) Parts.push('No servers listed yet. Server documentation will appear here as it is added.')
  const Languages = GetPublishedLanguages()
  for (const Language of Languages) {
    const Heading = Languages.length > 1 ? '###' : '##'
    if (Languages.length > 1) Parts.push(`## ${InlineText(Language.NativeName)} (${Language.Code})`)
    Parts.push(`${Heading} Directory`, `- ${Link('Server directory', MarkdownPath(DirectoryPath(Language.Code)), Site)}: Overview and current server listings.`)
    const Servers = Catalog.Servers.filter(({ data: Data }) => Data.language === Language.Code)
    const Policies = Catalog.Policies.filter(({ data: Data }) => Data.language === Language.Code)
    if (Servers.length) {
      Parts.push(`${Heading} Servers`, LocalizedServers(Catalog.Servers, Language.Code).filter(({ data: Data }) => Data.language === Language.Code).map(({ data: Data }) =>
        `- ${Link(Data.name, MarkdownPath(ServerPath(Data.slug, Data.language)), Site)}: ${InlineText(Data.description)}`).join('\n'))
    }
    if (Policies.length) {
      Parts.push(`${Heading} Optional`, [...Policies].sort((A, B) => PolicyPath(A).localeCompare(PolicyPath(B), 'en')).map((Policy) =>
        `- ${Link(Policy.data.title, MarkdownPath(PolicyPath(Policy)), Site)}`).join('\n'))
    }
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
  const Paths = [...GetPublishedLanguages().map((Language) => DirectoryPath(Language.Code)), ...Catalog.Servers.map(({ data: Data }) => ServerPath(Data.slug, Data.language)), ...Catalog.Policies.map(PolicyPath)]
  const Urls = [...new Set(Paths.map((Path) => CanonicalUrl(Path, Site)))].sort()
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Urls.map((Url) => `  <url><loc>${EscapeXml(Url)}</loc></url>`).join('\n')}\n</urlset>\n`
}

export function RenderDirectoryMarkdown(Catalog: DiscoveryCatalog, Site: URL | undefined, Language = DefaultLanguage): string {
  const { Messages } = GetLanguage(Language)
  const Servers = LocalizedServers(Catalog.Servers, Language)
  return Document([
    '# publicdata.stream', Messages.Summary, Messages.AboutDescription,
    `## ${InlineText(Messages.Directory)}`,
    Servers.length ? Servers.map(({ data: Data }) =>
      `- ${Link(Data.name, MarkdownPath(ServerPath(Data.slug, Data.language)), Site)} (${Data.capabilities.map((Capability) => Capability.toUpperCase()).join(', ')}): ${InlineText(Data.description)}${Data.language !== Language ? ` — ${InlineText(Messages.EnglishFallback)}` : ''}`).join('\n')
      : `${Messages.EmptyTitle} ${Messages.EmptyDetails}`,
  ])
}

function ClientMarkdown(Title: string, Example: ServerDocument['data']['codex']): string {
  const Heading = `### ${InlineText(Title)}`
  if ('unsupported' in Example) return `${Heading}\n\n${InlineText(Example.unsupported)}`
  const Runs = [...Example.config.matchAll(/`+/g)].map(([Run]) => Run.length)
  const Fence = '`'.repeat(Math.max(3, ...Runs.map((Length) => Length + 1)))
  return `${Heading}\n\n${Fence}${Example.format}\n${Example.config.replace(/\n?$/, '\n')}${Fence}`
}

export function RenderServerMarkdown(Server: ServerDocument, Site: URL | undefined, Policies?: PolicyDocument[]): string {
  const { data: Data } = Server
  const { Messages } = GetLanguage(Data.language)
  const Parts = [
    `# ${InlineText(Data.name)}`, InlineText(Data.description),
    `${InlineText(Messages.Capabilities)}: ${Data.capabilities.map((Capability) => Capability.toUpperCase()).join(', ')}`,
    Link(Messages.Directory, MarkdownPath(DirectoryPath(Data.language)), Site),
    `## ${InlineText(Messages.Installation)}`, Server.body?.trim() ?? '',
    `## ${InlineText(Messages.Clients)}`, ClientMarkdown('Codex', Data.codex), ClientMarkdown(Data.claude.client, Data.claude),
  ]
  if (Data.chatgptPlugin) {
    Parts.push(`## ${InlineText(Messages.Plugin)}`, Data.chatgptPlugin.instructions.split('\n').map((Line) => EscapeMarkdown(Line.trim())).join('  \n'),
      Link(Messages.PluginDefinition, Data.chatgptPlugin.definitionUrl, Site))
  }
  const PolicyLinks = (['terms', 'privacy'] as const).flatMap((Kind) => {
    const Slug = Data[Kind]
    if (!Slug) return []
    const Policy = Policies ? ResolvePolicy(Policies, Slug, Data.language) : undefined
    if (Policies && !Policy) throw new Error('Missing referenced policy in Markdown output.')
    const Language = Policy?.data.language ?? Data.language
    const Label = `${Kind === 'terms' ? Messages.Terms : Messages.Privacy}${Language !== Data.language ? ` — ${Messages.EnglishFallback}` : ''}`
    return [`- ${Link(Label, MarkdownPath(`${ServerPath(Data.slug, Language)}${Kind}/`), Site)}`]
  })
  if (PolicyLinks.length) Parts.push(`## ${InlineText(Messages.Policies)}`, PolicyLinks.join('\n'))
  return Document(Parts)
}

export function RenderPolicyMarkdown(Policy: PolicyDocument, Site: URL | undefined): string {
  const { Messages } = GetLanguage(Policy.data.language)
  return Document([`# ${InlineText(Policy.data.title)}`, Link(Messages.ServerDocumentation, MarkdownPath(ServerPath(Policy.data.server, Policy.data.language)), Site), Policy.body?.trim() ?? ''])
}
