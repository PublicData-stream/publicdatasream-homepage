import type { APIRoute } from 'astro'
import { GetCatalog } from '../lib/catalog.ts'
import { RenderDirectoryMarkdown } from '../lib/discovery.ts'

export const GET: APIRoute = async ({ site: Site }) => new Response(RenderDirectoryMarkdown(await GetCatalog(), Site), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
})
