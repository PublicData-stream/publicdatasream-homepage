import type { APIRoute } from 'astro'
import { RenderRobots } from '../lib/discovery.ts'

export const GET: APIRoute = ({ site: Site }) => new Response(RenderRobots(Site), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
})
