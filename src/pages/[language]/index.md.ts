import type { APIRoute } from 'astro'
import { DirectoryRoutes } from '../../lib/routes.ts'
import { GetCatalog } from '../../lib/catalog.ts'
import { RenderDirectoryMarkdown } from '../../lib/discovery.ts'

export const getStaticPaths = DirectoryRoutes
interface Props { language: string }
export const GET: APIRoute<Props> = async ({ props: Props, site: Site }) => new Response(RenderDirectoryMarkdown(await GetCatalog(), Site, Props.language), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
})
