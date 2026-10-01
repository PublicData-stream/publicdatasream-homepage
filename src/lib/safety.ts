function HasUnsafeUrlCharacters(Value: string): boolean {
  return /[\s\\]/u.test(Value) || [...Value].some((Character) => Character.charCodeAt(0) < 32 || Character.charCodeAt(0) === 127)
}

/** External destinations are explicit HTTPS URLs, never relative or credentialed. */
export function IsAllowedHttpsUrl(Value: string): boolean {
  if (!/^https:\/\//i.test(Value) || HasUnsafeUrlCharacters(Value)) return false
  try {
    const Url = new URL(Value)
    return Url.protocol === 'https:' && Url.hostname.length > 0 && !Url.username && !Url.password
  } catch {
    return false
  }
}

/** Markdown may also link to same-site root paths and document fragments. */
export function IsAllowedContentLink(Value: string): boolean {
  if (IsAllowedHttpsUrl(Value)) return true
  if (HasUnsafeUrlCharacters(Value)) return false
  return /^#.+/.test(Value) || /^\/(?!\/)/.test(Value)
}

function IsSensitiveKey(Key: string): boolean {
  const Normalized = Key.replace(/([a-z])([A-Z])/g, '$1_$2')
  return /(?:^|[_-])(?:token|password|passwd|secret|api[_-]?key|authorization|credential)(?:$|[_-])/i.test(Normalized)
}

function IsSafeCredentialValue(Key: string, Value: string): boolean {
  const Unquoted = Value.replace(/^["']|["']$/g, '').trim()
  if (/(?:_env_var|_env)$/i.test(Key)) return /^[A-Z][A-Z0-9_]*$/.test(Unquoted)
  const Credential = Unquoted.replace(/^Bearer\s+/i, '')
  return /^(?:\$\{[A-Z][A-Z0-9_]*\}|\$[A-Z][A-Z0-9_]*|<[A-Z][A-Z0-9_]*>)$/.test(Credential)
}

/**
 * Reject common literal-secret forms. This is a guardrail, not a general secret
 * detector: contributors must review unfamiliar configuration formats as well.
 * Never include the matched value in an error message.
 */
export function AssertSafeExample(Text: string): void {
  if (/(?:\bsk-[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bAKIA[A-Z0-9]{16}\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----)/.test(Text)) {
    throw new Error('Configuration contains a recognized secret pattern. Use an environment reference or placeholder.')
  }
  function InspectJson(Value: unknown): void {
    if (Array.isArray(Value)) {
      for (const Child of Value) InspectJson(Child)
    } else if (Value && typeof Value === 'object') {
      for (const [Key, Child] of Object.entries(Value)) {
        if (IsSensitiveKey(Key) && (typeof Child !== 'string' || !IsSafeCredentialValue(Key, Child))) {
          throw new Error('Configuration contains a literal credential assignment. Use an environment reference or placeholder.')
        }
        InspectJson(Child)
      }
    }
  }
  let Json: unknown
  try { Json = JSON.parse(Text) } catch { /* Non-JSON formats are checked below. */ }
  InspectJson(Json)
  // Quoted JSON/TOML/YAML keys and shell assignments; inspect every match.
  const Assignments = /["']?([A-Za-z_][\w.-]*)["']?\s*[:=]\s*("(?:\\.|[^"\\])*"|'[^']*'|[^\s,}{[\]\r\n]+)/g
  for (const Match of Text.matchAll(Assignments)) {
    const [, Key = '', Value = ''] = Match
    if (IsSensitiveKey(Key) && !IsSafeCredentialValue(Key, Value)) {
      throw new Error('Configuration contains a literal credential assignment. Use an environment reference or placeholder.')
    }
  }
  const Flags = /--([\w-]+)(?:=|\s+)("[^"]*"|'[^']*'|\S+)/g
  for (const [, Key = '', Value = ''] of Text.matchAll(Flags)) {
    if (IsSensitiveKey(Key) && !IsSafeCredentialValue(Key, Value)) {
      throw new Error('Configuration contains a literal credential flag. Use an environment reference or placeholder.')
    }
  }
  for (const Match of Text.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    const Url = new URL(Match[0])
    if (Url.username || Url.password) throw new Error('Configuration URLs must not contain credentials.')
    for (const [Key, Value] of Url.searchParams) {
      if (IsSensitiveKey(Key) && !IsSafeCredentialValue(Key, Value)) {
        throw new Error('Configuration URL contains a literal credential query parameter.')
      }
    }
  }
}
