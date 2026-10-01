import type { APIRoute, GetStaticPaths } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { getCatalog } from '../../../lib/catalog.ts';
import { renderServerMarkdown } from '../../../lib/discovery.ts';

export const getStaticPaths = (async () => {
  const { servers } = await getCatalog();
  return servers.map((server) => ({ params: { slug: server.data.slug }, props: { server } }));
}) satisfies GetStaticPaths;

interface Props { server: CollectionEntry<'servers'> }
export const GET: APIRoute<Props> = ({ props, site }) => new Response(renderServerMarkdown(props.server, site), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
});
