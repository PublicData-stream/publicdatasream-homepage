function hasUnsafeUrlCharacters(value: string): boolean {
  return /[\s\\]/u.test(value) || [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

/** External destinations are explicit HTTPS URLs, never relative or credentialed. */
export function isAllowedHttpsUrl(value: string): boolean {
  if (!/^https:\/\//i.test(value) || hasUnsafeUrlCharacters(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Markdown may also link to same-site root paths and document fragments. */
export function isAllowedContentLink(value: string): boolean {
  if (isAllowedHttpsUrl(value)) return true;
  if (hasUnsafeUrlCharacters(value)) return false;
  return /^#.+/.test(value) || /^\/(?!\/)/.test(value);
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/([a-z])([A-Z])/g, '$1_$2');
  return /(?:^|[_-])(?:token|password|passwd|secret|api[_-]?key|authorization|credential)(?:$|[_-])/i.test(normalized);
}

function isSafeCredentialValue(key: string, value: string): boolean {
  const unquoted = value.replace(/^["']|["']$/g, '').trim();
  if (/(?:_env_var|_env)$/i.test(key)) return /^[A-Z][A-Z0-9_]*$/.test(unquoted);
  const credential = unquoted.replace(/^Bearer\s+/i, '');
  return /^(?:\$\{[A-Z][A-Z0-9_]*\}|\$[A-Z][A-Z0-9_]*|<[A-Z][A-Z0-9_]*>)$/.test(credential);
}

/**
 * Reject common literal-secret forms. This is a guardrail, not a general secret
 * detector: contributors must review unfamiliar configuration formats as well.
 * Never include the matched value in an error message.
 */
export function assertSafeExample(text: string): void {
  if (/(?:\bsk-[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bAKIA[A-Z0-9]{16}\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----)/.test(text)) {
    throw new Error('Configuration contains a recognized secret pattern. Use an environment reference or placeholder.');
  }
  function inspectJson(value: unknown): void {
    if (Array.isArray(value)) {
      for (const child of value) inspectJson(child);
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (isSensitiveKey(key) && (typeof child !== 'string' || !isSafeCredentialValue(key, child))) {
          throw new Error('Configuration contains a literal credential assignment. Use an environment reference or placeholder.');
        }
        inspectJson(child);
      }
    }
  }
  let json: unknown;
  try { json = JSON.parse(text); } catch { /* Non-JSON formats are checked below. */ }
  inspectJson(json);
  // Quoted JSON/TOML/YAML keys and shell assignments; inspect every match.
  const assignments = /["']?([A-Za-z_][\w.-]*)["']?\s*[:=]\s*("(?:\\.|[^"\\])*"|'[^']*'|[^\s,}{[\]\r\n]+)/g;
  for (const match of text.matchAll(assignments)) {
    const [, key = '', value = ''] = match;
    if (isSensitiveKey(key) && !isSafeCredentialValue(key, value)) {
      throw new Error('Configuration contains a literal credential assignment. Use an environment reference or placeholder.');
    }
  }
  const flags = /--([\w-]+)(?:=|\s+)("[^"]*"|'[^']*'|\S+)/g;
  for (const [, key = '', value = ''] of text.matchAll(flags)) {
    if (isSensitiveKey(key) && !isSafeCredentialValue(key, value)) {
      throw new Error('Configuration contains a literal credential flag. Use an environment reference or placeholder.');
    }
  }
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    const url = new URL(match[0]);
    if (url.username || url.password) throw new Error('Configuration URLs must not contain credentials.');
    for (const [key, value] of url.searchParams) {
      if (isSensitiveKey(key) && !isSafeCredentialValue(key, value)) {
        throw new Error('Configuration URL contains a literal credential query parameter.');
      }
    }
  }
}
