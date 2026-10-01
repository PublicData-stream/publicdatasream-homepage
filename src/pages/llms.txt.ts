import type { APIRoute } from 'astro';
import { getCatalog } from '../lib/catalog.ts';
import { renderLlms } from '../lib/discovery.ts';

export const GET: APIRoute = async ({ site }) => new Response(renderLlms(await getCatalog(), site), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
