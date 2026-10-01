import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import contentSafety from '../src/lib/content-safety.ts';
import { assertSafeExample, isAllowedContentLink, isAllowedHttpsUrl } from '../src/lib/safety.ts';
import { serverSchema } from '../src/lib/content-schema.ts';

test('external links require absolute HTTPS with no credentials', () => {
  for (const url of ['https://example.org/path?q=1#section', 'HTTPS://example.org', 'https://example.org:8443/']) {
    assert.equal(isAllowedHttpsUrl(url), true, url);
  }
  for (const url of ['http://example.org', '//example.org', 'javascript:alert(1)', 'data:text/html,test', 'mailto:user@example.org', 'https://', 'https://user:pass@example.org', 'https://example.org\\evil', ' https://example.org', 'https://example.org\n']) {
    assert.equal(isAllowedHttpsUrl(url), false, url);
  }
  assert.equal(isAllowedContentLink('/servers/example/'), true);
  assert.equal(isAllowedContentLink('#configuration'), true);
  assert.equal(isAllowedContentLink('../example'), false);
});

test('credential placeholders and environment references are allowed', () => {
  for (const example of [
    'bearer_token_env_var = "PUBLICDATA_TOKEN"',
    'API_TOKEN="$PUBLICDATA_TOKEN"',
    'api_key = "<YOUR_API_KEY>"',
    '{"headers":{"Authorization":"Bearer ${PUBLICDATA_TOKEN}"}}',
    'client --api-key "$PUBLICDATA_TOKEN"',
    'https://example.org/?token=%24%7BPUBLICDATA_TOKEN%7D',
    '{"env":{"API_KEY":"${PUBLICDATA_KEY}"}}',
  ]) assert.doesNotThrow(() => assertSafeExample(example));
});

test('literal credentials are rejected across common configuration formats', () => {
  for (const example of [
    'api_key = "fictional-literal"',
    'token: fictional-literal',
    '{"headers":{"Authorization":"Bearer fictional-literal"}}',
    '{"env":{"API_KEY":"fictional-literal"}}',
    '{"\\u0061piKey":"fictional-literal"}',
    'client --api-key=fictional-literal',
    'https://example.org/?access_token=fictional-literal',
    'https://user:fictional-literal@example.org/',
    `sk-${'a'.repeat(24)}`,
    '-----BEGIN PRIVATE KEY-----',
  ]) assert.throws(() => assertSafeExample(example), /credential|secret|PRIVATE/i);
});

async function validateMarkdown(markdown: string) {
  const processor = unified().use(remarkParse).use(contentSafety);
  return processor.run(processor.parse(markdown));
}

test('Markdown checks inline, reference, autolink and image destinations', async () => {
  for (const markdown of [
    '[unsafe](javascript:alert)',
    '[unsafe][target]\n\n[target]: http://example.org',
    '<http://example.org>',
    '[unsafe](//example.org)',
    '[unsafe](jav&#x61;script:alert)',
    '![remote](https://example.org/image.png)',
    '![remote][target]\n\n[target]: https://example.org/image.png',
    '<a href="https://example.org">raw HTML</a>',
    '```json\n{"token":"fictional-literal"}\n```',
    '`TOKEN="fictional-literal"`',
  ]) await assert.rejects(validateMarkdown(markdown));
  await assert.doesNotReject(validateMarkdown('[docs](https://example.org)\n\n[local](/servers/example/)\n\n[part](#setup)\n\n![local](/icon.svg)'));
});

const baseEntry = {
  slug: 'example', name: 'Example', description: 'Synthetic fixture.', capabilities: ['mcp'],
  codex: { format: 'toml', config: '[mcp_servers.example]\nurl = "https://example.org/mcp"' },
  claude: { client: 'Claude Code', format: 'json', config: '{"mcpServers":{}}' },
};

test('plugin objects must be complete and configuration fields must be safe', () => {
  assert.equal(serverSchema.safeParse(baseEntry).success, true);
  assert.equal(serverSchema.safeParse({ ...baseEntry, chatgptPlugin: { definitionUrl: 'https://example.org/plugin', instructions: 'Use the defined plugin.' } }).success, true);
  assert.equal(serverSchema.safeParse({ ...baseEntry, chatgptPlugin: { definitionUrl: 'https://example.org/plugin' } }).success, false);
  assert.equal(serverSchema.safeParse({ ...baseEntry, chatgptPlugin: { definitionUrl: 'http://example.org/plugin', instructions: 'Invalid URL.' } }).success, false);
  assert.equal(serverSchema.safeParse({ ...baseEntry, codex: { format: 'toml', config: 'token = "fictional-literal"' } }).success, false);
  assert.equal(serverSchema.safeParse({ ...baseEntry, capabilities: ['api'], codex: { unsupported: 'This API has no MCP transport.' }, claude: { client: 'Claude Desktop', unsupported: 'This API has no MCP transport.' } }).success, true);
});
