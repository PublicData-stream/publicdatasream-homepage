import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { GetCatalog } from '../../../../lib/catalog.ts'
import { RenderPolicyMarkdown } from '../../../../lib/discovery.ts'

export const getStaticPaths = (async () => {
  const { Policies } = await GetCatalog()
  return Policies.map((Policy) => ({ params: { slug: Policy.data.server, kind: Policy.data.kind }, props: { policy: Policy } }))
}) satisfies GetStaticPaths

interface Props { policy: CollectionEntry<'policies'> }
export const GET: APIRoute<Props> = ({ props: Props, site: Site }) => new Response(RenderPolicyMarkdown(Props.policy, Site), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
})
