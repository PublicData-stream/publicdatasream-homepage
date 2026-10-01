import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { GetCatalog } from '../../../lib/catalog.ts'
import { RenderServerMarkdown } from '../../../lib/discovery.ts'

export const getStaticPaths = (async () => {
  const { Servers } = await GetCatalog()
  return Servers.map((Server) => ({ params: { slug: Server.data.slug }, props: { server: Server } }))
}) satisfies GetStaticPaths

interface Props { server: CollectionEntry<'servers'> }
export const GET: APIRoute<Props> = ({ props: Props, site: Site }) => new Response(RenderServerMarkdown(Props.server, Site), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
})
