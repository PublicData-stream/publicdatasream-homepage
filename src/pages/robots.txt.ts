import type { APIRoute } from 'astro';
import { renderRobots } from '../lib/discovery.ts';

export const GET: APIRoute = ({ site }) => new Response(renderRobots(site), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
