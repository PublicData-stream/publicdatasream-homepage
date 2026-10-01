import { getCollection } from 'astro:content'
import { ValidateCatalog } from './catalog-validation.ts'

export async function GetCatalog() {
  const [Servers, Policies] = await Promise.all([getCollection('servers'), getCollection('policies')])
  ValidateCatalog(Servers, Policies)
  Servers.sort((A, B) => A.data.name.localeCompare(B.data.name, 'en') || A.data.slug.localeCompare(B.data.slug, 'en'))
  return { Servers, Policies }
}
