import { GetCatalog } from './catalog.ts'
import { DefaultLanguage } from './languages.ts'
import { GetPublishedLanguages } from './localization.ts'

export function DirectoryRoutes() {
  return GetPublishedLanguages().filter((Language) => Language.Code !== DefaultLanguage)
    .map((Language) => ({ params: { language: Language.Code }, props: { language: Language.Code } }))
}

export async function ServerRoutes(Localized: boolean) {
  const { Servers } = await GetCatalog()
  return Servers.filter((Server) => (Server.data.language !== DefaultLanguage) === Localized)
    .map((Server) => ({ params: { slug: Server.data.slug, language: Server.data.language }, props: { server: Server } }))
}

export async function PolicyRoutes(Localized: boolean) {
  const { Policies } = await GetCatalog()
  return Policies.filter((Policy) => (Policy.data.language !== DefaultLanguage) === Localized)
    .map((Policy) => ({ params: { slug: Policy.data.server, kind: Policy.data.kind, language: Policy.data.language }, props: { policy: Policy } }))
}
