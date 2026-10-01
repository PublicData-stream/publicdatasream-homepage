import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { ServerRoutes } from '../../../../lib/routes.ts'
import { RenderServerMarkdown } from '../../../../lib/discovery.ts'
import { GetCatalog } from '../../../../lib/catalog.ts'

export const getStaticPaths = (() => ServerRoutes(true)) satisfies GetStaticPaths

interface Props { server: CollectionEntry<'servers'> }
export const GET: APIRoute<Props> = async ({ props: Props, site: Site }) => new Response(RenderServerMarkdown(Props.server, Site, (await GetCatalog()).Policies), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
})
