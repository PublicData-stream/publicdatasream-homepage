import { iso6393 as Registry } from 'iso-639-3'

export const DefaultLanguage = 'en'
const Codes = new Map<string, string>()
for (const Language of Registry) {
  if (Language.scope === 'special' || Language.type === 'special') continue
  const Canonical = Language.iso6391 ?? Language.iso6393
  Codes.set(Language.iso6393, Canonical)
  if (Language.iso6391) Codes.set(Language.iso6391, Canonical)
}

/** Resolve registered ISO 639-1/-3 codes using the pinned registry snapshot. */
export function NormalizeLanguage(Value: string): string {
  const Code = Codes.get(Value.trim().toLowerCase())
  if (!Code) throw new Error('Use a registered ISO 639-1 or ISO 639-3 language code without region or script subtags.')
  return Code
}
