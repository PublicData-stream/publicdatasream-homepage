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
export function validateCatalog(servers: ServerRecord[], policies: PolicyRecord[]): void {
  const serverSlugs = new Set<string>();
  const policyBySlug = new Map<string, PolicyRecord>();
  const policyRoutes = new Set<string>();
  for (const server of servers) {
    if (serverSlugs.has(server.data.slug)) throw new Error(`Duplicate server slug: ${server.data.slug}`);
    if (!server.body?.trim()) throw new Error(`Server ${server.id} needs Markdown installation instructions.`);
    serverSlugs.add(server.data.slug);
  }
  for (const policy of policies) {
    const { slug, server, kind } = policy.data;
    if (policyBySlug.has(slug)) throw new Error(`Duplicate policy slug: ${slug}`);
    if (!serverSlugs.has(server)) throw new Error(`Policy ${policy.id} references an unknown server.`);
    if (!policy.body?.trim()) throw new Error(`Policy ${policy.id} needs policy content.`);
    const route = `${server}/${kind}`;
    if (policyRoutes.has(route)) throw new Error(`Duplicate policy route: ${route}`);
    policyBySlug.set(slug, policy);
    policyRoutes.add(route);
  }
  for (const server of servers) {
    for (const kind of ['terms', 'privacy'] as const) {
      const reference = server.data[kind];
      if (!reference) continue;
      const policy = policyBySlug.get(reference);
      if (!policy || policy.data.server !== server.data.slug || policy.data.kind !== kind) {
        throw new Error(`Server ${server.id} has an invalid ${kind} policy reference.`);
      }
    }
  }
}
