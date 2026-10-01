import type { APIRoute } from 'astro'
import { GetCatalog } from '../lib/catalog.ts'
import { RenderSitemap } from '../lib/discovery.ts'

export const GET: APIRoute = async ({ site: Site }) => new Response(RenderSitemap(await GetCatalog(), Site), {
  headers: { 'Content-Type': 'application/xml; charset=utf-8' },
})
