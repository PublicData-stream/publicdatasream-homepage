import type { Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';
import { assertSafeExample, isAllowedContentLink } from './safety.ts';

const contentSafety: Plugin<[], Root> = () => (tree, file) => {
  const definitions = new Map<string, string>();
  function collectDefinitions(node: Root | RootContent): void {
    if (node.type === 'definition') definitions.set(node.identifier, node.url);
    if ('children' in node) for (const child of node.children) collectDefinitions(child);
  }
  collectDefinitions(tree);
  function inspect(node: Root | RootContent): void {
    if (node.type === 'html') file.fail('Raw HTML is not allowed in site Markdown.', node);
    if (node.type === 'link' || node.type === 'definition' || node.type === 'image') {
      if (!isAllowedContentLink(node.url)) {
        file.fail('Links must use absolute HTTPS URLs, root-relative site paths, or fragments.', node);
      }
      if (node.type === 'image' && !/^\/(?!\/)/.test(node.url)) {
        file.fail('Images must use local root-relative asset paths to match the site CSP.', node);
      }
    }
    if (node.type === 'imageReference') {
      const destination = definitions.get(node.identifier);
      if (destination && !/^\/(?!\/)/.test(destination)) {
        file.fail('Images must use local root-relative asset paths to match the site CSP.', node);
      }
    }
    if (node.type === 'code' || node.type === 'inlineCode') {
      try {
        assertSafeExample(node.value);
      } catch {
        file.fail('Code example may contain credentials. Use environment references or placeholders.', node);
      }
    }
    if ('children' in node) for (const child of node.children) inspect(child);
  }
  inspect(tree);
};

export default contentSafety;
