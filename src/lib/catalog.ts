import { getCollection } from 'astro:content';
import { validateCatalog } from './catalog-validation.ts';

export async function getCatalog() {
  const [servers, policies] = await Promise.all([getCollection('servers'), getCollection('policies')]);
  validateCatalog(servers, policies);
  servers.sort((a, b) => a.data.name.localeCompare(b.data.name, 'en') || a.data.slug.localeCompare(b.data.slug, 'en'));
  return { servers, policies };
}
