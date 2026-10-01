import type { APIRoute } from 'astro';
import { getCatalog } from '../lib/catalog.ts';
import { renderSitemap } from '../lib/discovery.ts';

export const GET: APIRoute = async ({ site }) => new Response(renderSitemap(await getCatalog(), site), {
  headers: { 'Content-Type': 'application/xml; charset=utf-8' },
});
