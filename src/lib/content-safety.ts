import type { Root, RootContent } from 'mdast'
import type { Plugin } from 'unified'
import { AssertSafeExample, IsAllowedContentLink } from './safety.ts'

const ContentSafety: Plugin<[], Root> = () => (Tree, File) => {
  const Definitions = new Map<string, string>()
  function CollectDefinitions(Node: Root | RootContent): void {
    if (Node.type === 'definition') Definitions.set(Node.identifier, Node.url)
    if ('children' in Node) for (const Child of Node.children) CollectDefinitions(Child)
  }
  CollectDefinitions(Tree)
  function Inspect(Node: Root | RootContent): void {
    if (Node.type === 'html') File.fail('Raw HTML is not allowed in site Markdown.', Node)
    if (Node.type === 'link' || Node.type === 'definition' || Node.type === 'image') {
      if (!IsAllowedContentLink(Node.url)) {
        File.fail('Links must use absolute HTTPS URLs, root-relative site paths, or fragments.', Node)
      }
      if (Node.type === 'image' && !/^\/(?!\/)/.test(Node.url)) {
        File.fail('Images must use local root-relative asset paths to match the site CSP.', Node)
      }
    }
    if (Node.type === 'imageReference') {
      const Destination = Definitions.get(Node.identifier)
      if (Destination && !/^\/(?!\/)/.test(Destination)) {
        File.fail('Images must use local root-relative asset paths to match the site CSP.', Node)
      }
    }
    if (Node.type === 'code' || Node.type === 'inlineCode') {
      try {
        AssertSafeExample(Node.value)
      } catch {
        File.fail('Code example may contain credentials. Use environment references or placeholders.', Node)
      }
    }
    if ('children' in Node) for (const Child of Node.children) Inspect(Child)
  }
  Inspect(Tree)
}

export default ContentSafety
