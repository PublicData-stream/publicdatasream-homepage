import type { APIRoute, GetStaticPaths } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { getCatalog } from '../../../../lib/catalog.ts';
import { renderPolicyMarkdown } from '../../../../lib/discovery.ts';

export const getStaticPaths = (async () => {
  const { policies } = await getCatalog();
  return policies.map((policy) => ({ params: { slug: policy.data.server, kind: policy.data.kind }, props: { policy } }));
}) satisfies GetStaticPaths;

interface Props { policy: CollectionEntry<'policies'> }
export const GET: APIRoute<Props> = ({ props, site }) => new Response(renderPolicyMarkdown(props.policy, site), {
  headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
});
