import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { PolicyRoutes } from '../../../../../lib/routes.ts'
import { RenderPolicyMarkdown } from '../../../../../lib/discovery.ts'

export const getStaticPaths = (() => PolicyRoutes(true)) satisfies GetStaticPaths

interface Props { policy: CollectionEntry<'policies'> }
export const GET: APIRoute<Props> = ({ props: Props, site: Site }) => new Response(RenderPolicyMarkdown(Props.policy, Site), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
})
