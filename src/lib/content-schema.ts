import { z } from 'astro/zod'
import { AssertSafeExample, IsAllowedHttpsUrl } from './safety.ts'

const RequiredText = z.string().trim().min(1)
const SafeText = RequiredText.refine((Value) => {
  try {
    AssertSafeExample(Value)
    return true
  } catch {
    return false
  }
}, 'Use credential placeholders or environment references, never literal secrets.')
const HttpsUrl = RequiredText.refine(IsAllowedHttpsUrl, 'Use an absolute HTTPS URL without embedded credentials.')
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase, hyphen-separated slug.')
const Example = z.object({
  format: z.enum(['toml', 'json', 'sh', 'text']),
  config: SafeText,
}).strict()
const Unsupported = z.object({ unsupported: RequiredText }).strict()
const ClaudeClient = z.enum(['Claude Desktop', 'Claude Code'])

export const ServerSchema = z.object({
  slug: Slug,
  name: RequiredText,
  description: RequiredText,
  capabilities: z.array(z.enum(['mcp', 'api'])).min(1),
  codex: z.union([Example, Unsupported]),
  claude: z.union([
    Example.extend({ client: ClaudeClient }),
    Unsupported.extend({ client: ClaudeClient }),
  ]),
  chatgptPlugin: z.object({
    definitionUrl: HttpsUrl,
    instructions: SafeText,
  }).strict().optional(),
  terms: Slug.optional(),
  privacy: Slug.optional(),
}).strict()

export const PolicySchema = z.object({
  slug: Slug,
  server: Slug,
  kind: z.enum(['terms', 'privacy']),
  title: RequiredText,
}).strict()
