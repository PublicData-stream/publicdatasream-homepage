import { DefaultLanguage, NormalizeLanguage } from './languages.ts'
import { GetPublishedLanguages, ResolvePolicy } from './localization.ts'

export interface ServerRecord {
  id: string;
  body?: string;
  data: { slug: string; language?: string; terms?: string; privacy?: string };
}

export interface PolicyRecord {
  id: string;
  body?: string;
  data: { slug: string; language?: string; server: string; kind: 'terms' | 'privacy' };
}

function EntryLanguage(Entry: ServerRecord | PolicyRecord, Languages: string[]): string {
  const Language = Entry.data.language ?? DefaultLanguage
  if (NormalizeLanguage(Language) !== Language || !Languages.includes(Language)) throw new Error(`Entry ${Entry.id} has an unpublished or noncanonical language.`)
  const Segments = Entry.id.split('/')
  if (Language === DefaultLanguage ? Segments.length !== 1 : Segments.length !== 2 || Segments[0] !== Language) {
    throw new Error(`Entry ${Entry.id} has a language/directory mismatch.`)
  }
  return Language
}

/** Validate cross-entry contracts before any page is published. */
export function ValidateCatalog(Servers: ServerRecord[], Policies: PolicyRecord[], Languages = GetPublishedLanguages().map((Language) => Language.Code)): void {
  const ServerSlugs = new Set<string>()
  const PolicyBySlug = new Map<string, PolicyRecord>()
  const PolicyRoutes = new Set<string>()
  for (const Server of Servers) {
    const Language = EntryLanguage(Server, Languages)
    const Key = `${Language}/${Server.data.slug}`
    if (ServerSlugs.has(Key)) throw new Error(`Duplicate server slug: ${Key}`)
    if (!Server.body?.trim()) throw new Error(`Server ${Server.id} needs Markdown installation instructions.`)
    ServerSlugs.add(Key)
  }
  for (const Server of Servers) {
    if (!ServerSlugs.has(`${DefaultLanguage}/${Server.data.slug}`)) throw new Error(`Server ${Server.id} needs an English counterpart.`)
  }
  for (const Policy of Policies) {
    const Language = EntryLanguage(Policy, Languages)
    const { slug: Slug, server: Server, kind: Kind } = Policy.data
    const Key = `${Language}/${Slug}`
    if (PolicyBySlug.has(Key)) throw new Error(`Duplicate policy slug: ${Key}`)
    if (!ServerSlugs.has(`${Language}/${Server}`)) throw new Error(`Policy ${Policy.id} references an unknown server in its language.`)
    if (!Policy.body?.trim()) throw new Error(`Policy ${Policy.id} needs policy content.`)
    const Route = `${Language}/${Server}/${Kind}`
    if (PolicyRoutes.has(Route)) throw new Error(`Duplicate policy route: ${Route}`)
    PolicyBySlug.set(Key, Policy)
    PolicyRoutes.add(Route)
  }
  for (const Policy of Policies) {
    const English = PolicyBySlug.get(`${DefaultLanguage}/${Policy.data.slug}`)
    if (!English || English.data.server !== Policy.data.server || English.data.kind !== Policy.data.kind) {
      throw new Error(`Policy ${Policy.id} needs a matching English counterpart.`)
    }
  }
  for (const Server of Servers) {
    for (const Kind of ['terms', 'privacy'] as const) {
      const Reference = Server.data[Kind]
      if (!Reference) continue
      const Policy = ResolvePolicy(Policies, Reference, Server.data.language)
      if (!Policy || Policy.data.server !== Server.data.slug || Policy.data.kind !== Kind) {
        throw new Error(`Server ${Server.id} has an invalid ${Kind} policy reference.`)
      }
    }
  }
}
