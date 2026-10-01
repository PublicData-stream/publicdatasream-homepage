import type { APIRoute } from 'astro'
import { GetCatalog } from '../lib/catalog.ts'
import { RenderLlms } from '../lib/discovery.ts'

export const GET: APIRoute = async ({ site: Site }) => new Response(RenderLlms(await GetCatalog(), Site), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
})
