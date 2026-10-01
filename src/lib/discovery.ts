import type { CollectionEntry } from 'astro:content';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { VFile } from 'vfile';
import contentSafety from './content-safety.ts';
import { isAllowedHttpsUrl } from './safety.ts';

type ServerDocument = Pick<CollectionEntry<'servers'>, 'data' | 'body'>;
type PolicyDocument = Pick<CollectionEntry<'policies'>, 'data' | 'body'>;
export interface DiscoveryCatalog {
  servers: ServerDocument[];
  policies: PolicyDocument[];
}

const markdownProcessor = unified().use(remarkParse).use(contentSafety);
const summary = 'Discover publicdata.stream MCP and API servers, installation instructions, and client configuration.';

export function canonicalUrl(path: string, site: URL | undefined): string {
  if (!site || !isAllowedHttpsUrl(site.href)) throw new Error('Discovery files require an HTTPS Astro site URL.');
  return new URL(path, site).href;
}

export function markdownPath(pagePath: string): string {
  return `${pagePath}index.md`;
}

export function serverPath(slug: string): string {
  return `/servers/${slug}/`;
}

export function policyPath(policy: PolicyDocument): string {
  return `${serverPath(policy.data.server)}${policy.data.kind}/`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!<>|~-]/g, '\\$&');
}

function inlineText(value: string): string {
  return escapeMarkdown(value.replace(/\s+/gu, ' ').trim());
}

function link(label: string, path: string, site: URL | undefined): string {
  return `[${inlineText(label)}](<${canonicalUrl(path, site)}>)`;
}

/** Apply the same source-Markdown guard before publishing plain-text documents. */
export function validateMarkdown(markdown: string): string {
  const file = new VFile({ value: markdown });
  markdownProcessor.runSync(markdownProcessor.parse(file), file);
  return markdown;
}

function document(parts: string[]): string {
  return validateMarkdown(`${parts.join('\n\n')}\n`);
}

export function renderLlms(catalog: DiscoveryCatalog, site: URL | undefined): string {
  const parts = ['# publicdata.stream', `> ${summary}`];
  if (catalog.servers.length === 0) parts.push('No servers listed yet. Server documentation will appear here as it is added.');
  parts.push('## Directory', `- ${link('Server directory', '/index.md', site)}: Overview and current server listings.`);
  if (catalog.servers.length) {
    parts.push('## Servers', catalog.servers.map(({ data }) =>
      `- ${link(data.name, markdownPath(serverPath(data.slug)), site)}: ${inlineText(data.description)}`).join('\n'));
  }
  if (catalog.policies.length) {
    parts.push('## Optional', [...catalog.policies].sort((a, b) => policyPath(a).localeCompare(policyPath(b), 'en')).map((policy) =>
      `- ${link(policy.data.title, markdownPath(policyPath(policy)), site)}`).join('\n'));
  }
  return document(parts);
}

export function renderRobots(site: URL | undefined): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${canonicalUrl('/sitemap.xml', site)}\n`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function renderSitemap(catalog: DiscoveryCatalog, site: URL | undefined): string {
  const paths = ['/', ...catalog.servers.map(({ data }) => serverPath(data.slug)), ...catalog.policies.map(policyPath)];
  const urls = [...new Set(paths.map((path) => canonicalUrl(path, site)))].sort();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function renderDirectoryMarkdown(catalog: DiscoveryCatalog, site: URL | undefined): string {
  return document([
    '# publicdata.stream', summary,
    'This directory brings service documentation together in one place: what each server does, how to connect, and where to find its terms and privacy policy.',
    '## Server directory',
    catalog.servers.length ? catalog.servers.map(({ data }) =>
      `- ${link(data.name, markdownPath(serverPath(data.slug)), site)} (${data.capabilities.map((capability) => capability.toUpperCase()).join(', ')}): ${inlineText(data.description)}`).join('\n')
      : 'No servers listed yet. Server documentation will appear here as it is added.',
  ]);
}

function clientMarkdown(title: string, example: ServerDocument['data']['codex']): string {
  const heading = `### ${inlineText(title)}`;
  if ('unsupported' in example) return `${heading}\n\n${inlineText(example.unsupported)}`;
  const runs = [...example.config.matchAll(/`+/g)].map(([run]) => run.length);
  const fence = '`'.repeat(Math.max(3, ...runs.map((length) => length + 1)));
  return `${heading}\n\n${fence}${example.format}\n${example.config.replace(/\n?$/, '\n')}${fence}`;
}

export function renderServerMarkdown(server: ServerDocument, site: URL | undefined): string {
  const { data } = server;
  const parts = [
    `# ${inlineText(data.name)}`, inlineText(data.description),
    `Capabilities: ${data.capabilities.map((capability) => capability.toUpperCase()).join(', ')}`,
    link('Server directory', '/index.md', site),
    '## Installation & configuration', server.body?.trim() ?? '',
    '## Client configuration', clientMarkdown('Codex', data.codex), clientMarkdown(data.claude.client, data.claude),
  ];
  if (data.chatgptPlugin) {
    parts.push('## ChatGPT plugin', data.chatgptPlugin.instructions.split('\n').map((line) => escapeMarkdown(line.trim())).join('  \n'),
      link('Plugin definition & documentation', data.chatgptPlugin.definitionUrl, site));
  }
  const policies = (['terms', 'privacy'] as const).filter((kind) => data[kind]).map((kind) =>
    `- ${link(kind === 'terms' ? 'Terms of Service' : 'Privacy Policy', markdownPath(`${serverPath(data.slug)}${kind}/`), site)}`);
  if (policies.length) parts.push('## Policies', policies.join('\n'));
  return document(parts);
}

export function renderPolicyMarkdown(policy: PolicyDocument, site: URL | undefined): string {
  return document([`# ${inlineText(policy.data.title)}`, link('Server documentation', markdownPath(serverPath(policy.data.server)), site), policy.body?.trim() ?? '']);
}
