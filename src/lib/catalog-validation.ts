export interface ServerRecord {
  id: string;
  body?: string;
  data: { slug: string; terms?: string; privacy?: string };
}

export interface PolicyRecord {
  id: string;
  body?: string;
  data: { slug: string; server: string; kind: 'terms' | 'privacy' };
}

/** Validate cross-entry contracts before any page is published. */
export function ValidateCatalog(Servers: ServerRecord[], Policies: PolicyRecord[]): void {
  const ServerSlugs = new Set<string>()
  const PolicyBySlug = new Map<string, PolicyRecord>()
  const PolicyRoutes = new Set<string>()
  for (const Server of Servers) {
    if (ServerSlugs.has(Server.data.slug)) throw new Error(`Duplicate server slug: ${Server.data.slug}`)
    if (!Server.body?.trim()) throw new Error(`Server ${Server.id} needs Markdown installation instructions.`)
    ServerSlugs.add(Server.data.slug)
  }
  for (const Policy of Policies) {
    const { slug: Slug, server: Server, kind: Kind } = Policy.data
    if (PolicyBySlug.has(Slug)) throw new Error(`Duplicate policy slug: ${Slug}`)
    if (!ServerSlugs.has(Server)) throw new Error(`Policy ${Policy.id} references an unknown server.`)
    if (!Policy.body?.trim()) throw new Error(`Policy ${Policy.id} needs policy content.`)
    const Route = `${Server}/${Kind}`
    if (PolicyRoutes.has(Route)) throw new Error(`Duplicate policy route: ${Route}`)
    PolicyBySlug.set(Slug, Policy)
    PolicyRoutes.add(Route)
  }
  for (const Server of Servers) {
    for (const Kind of ['terms', 'privacy'] as const) {
      const Reference = Server.data[Kind]
      if (!Reference) continue
      const Policy = PolicyBySlug.get(Reference)
      if (!Policy || Policy.data.server !== Server.data.slug || Policy.data.kind !== Kind) {
        throw new Error(`Server ${Server.id} has an invalid ${Kind} policy reference.`)
      }
    }
  }
}
