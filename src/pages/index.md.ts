import type { APIRoute } from 'astro';
import { getCatalog } from '../lib/catalog.ts';
import { renderDirectoryMarkdown } from '../lib/discovery.ts';

export const GET: APIRoute = async ({ site }) => new Response(renderDirectoryMarkdown(await getCatalog(), site), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
});
