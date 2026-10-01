import { z } from 'astro/zod';
import { assertSafeExample, isAllowedHttpsUrl } from './safety.ts';

const requiredText = z.string().trim().min(1);
const safeText = requiredText.refine((value) => {
  try {
    assertSafeExample(value);
    return true;
  } catch {
    return false;
  }
}, 'Use credential placeholders or environment references, never literal secrets.');
const httpsUrl = requiredText.refine(isAllowedHttpsUrl, 'Use an absolute HTTPS URL without embedded credentials.');
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase, hyphen-separated slug.');
const example = z.object({
  format: z.enum(['toml', 'json', 'sh', 'text']),
  config: safeText,
}).strict();
const unsupported = z.object({ unsupported: requiredText }).strict();
const claudeClient = z.enum(['Claude Desktop', 'Claude Code']);

export const serverSchema = z.object({
  slug,
  name: requiredText,
  description: requiredText,
  capabilities: z.array(z.enum(['mcp', 'api'])).min(1),
  codex: z.union([example, unsupported]),
  claude: z.union([
    example.extend({ client: claudeClient }),
    unsupported.extend({ client: claudeClient }),
  ]),
  chatgptPlugin: z.object({
    definitionUrl: httpsUrl,
    instructions: safeText,
  }).strict().optional(),
  terms: slug.optional(),
  privacy: slug.optional(),
}).strict();

export const policySchema = z.object({
  slug,
  server: slug,
  kind: z.enum(['terms', 'privacy']),
  title: requiredText,
}).strict();
