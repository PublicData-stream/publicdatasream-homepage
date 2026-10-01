import { English } from '../i18n/en.ts'
import { PublishedLanguages, type LanguageDefinition } from '../i18n/locales.ts'
import { DefaultLanguage, NormalizeLanguage } from './languages.ts'
import type { PolicyRecord, ServerRecord } from './catalog-validation.ts'

export function GetPublishedLanguages(): LanguageDefinition[] {
  const Codes = new Set<string>()
  for (const Language of PublishedLanguages) {
    if (NormalizeLanguage(Language.Code) !== Language.Code || Codes.has(Language.Code)) throw new Error('Published language codes must be canonical and unique.')
    if (!Language.NativeName.trim() || !['ltr', 'rtl'].includes(Language.Direction)) throw new Error('Published languages need a name and text direction.')
    for (const Key of Object.keys(English) as (keyof typeof English)[]) {
      if (typeof Language.Messages[Key] !== typeof English[Key]) throw new Error(`Incomplete dictionary for ${Language.Code}: ${Key}`)
    }
    Codes.add(Language.Code)
  }
  if (!Codes.has(DefaultLanguage)) throw new Error('English must be published as the default language.')
  return PublishedLanguages
}

export function GetLanguage(Code = DefaultLanguage): LanguageDefinition {
  const Canonical = NormalizeLanguage(Code)
  const Language = GetPublishedLanguages().find((Entry) => Entry.Code === Canonical)
  if (!Language) throw new Error(`Language ${Canonical} is not published.`)
  return Language
}

export function DirectoryPath(Language = DefaultLanguage): string {
  const Canonical = NormalizeLanguage(Language)
  return Canonical === DefaultLanguage ? '/' : `/${Canonical}/`
}

export function ServerPath(Slug: string, Language = DefaultLanguage): string {
  return `${DirectoryPath(Language)}servers/${Slug}/`
}

export function PolicyPath(Policy: Pick<PolicyRecord, 'data'>): string {
  return `${ServerPath(Policy.data.server, Policy.data.language)}${Policy.data.kind}/`
}

export function ResolveServer<T extends Pick<ServerRecord, 'data'>>(Servers: T[], Slug: string, Language = DefaultLanguage): T | undefined {
  return Servers.find(({ data: Data }) => Data.slug === Slug && (Data.language ?? DefaultLanguage) === Language)
    ?? Servers.find(({ data: Data }) => Data.slug === Slug && (Data.language ?? DefaultLanguage) === DefaultLanguage)
}

export function ResolvePolicy<T extends Pick<PolicyRecord, 'data'>>(Policies: T[], Slug: string, Language = DefaultLanguage): T | undefined {
  return Policies.find(({ data: Data }) => Data.slug === Slug && (Data.language ?? DefaultLanguage) === Language)
    ?? Policies.find(({ data: Data }) => Data.slug === Slug && (Data.language ?? DefaultLanguage) === DefaultLanguage)
}

export function LocalizedServers<T extends Record<'data', ServerRecord['data'] & Record<'name', string>>>(Servers: T[], Language = DefaultLanguage): T[] {
  const Selected = Servers.filter(({ data: Data }) => (Data.language ?? DefaultLanguage) === DefaultLanguage)
    .map((Server) => ResolveServer(Servers, Server.data.slug, Language) ?? Server)
  return Selected.sort((A, B) => A.data.name.localeCompare(B.data.name, Language) || A.data.slug.localeCompare(B.data.slug, 'en'))
}
