import { getPostLinks, type PostLink } from './postLinks.ts';

const routes: Record<string, string> = { launchpad: '/launchpad', rooms: '/rooms', newspaper: '/newspaper' };

export function getPostTextLinks(content: string): PostLink[] {
  const urls = getPostLinks(content);
  const mentions: PostLink[] = [];
  for (const match of content.matchAll(/(?<![\w@/])@(launchpad|rooms|newspaper)(?![\w-])/gi)) {
    const start = match.index!;
    if (urls.some((url) => start >= url.start && start < url.end)) continue;
    mentions.push({ start, end: start + match[0].length, text: match[0], href: routes[match[1].toLowerCase()] });
  }
  return [...urls, ...mentions].sort((a, b) => a.start - b.start);
}

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

/** Convert mentions only in visible Markdown text, preserving links and code. */
export function remarkPlatformMentions() {
  return (tree: MarkdownNode) => {
    function visit(node: MarkdownNode) {
      if (!node.children || ['link', 'linkReference', 'code', 'inlineCode', 'html'].includes(node.type)) return;
      node.children = node.children.flatMap((child): MarkdownNode[] => {
        if (child.type !== 'text' || !child.value) { visit(child); return [child]; }
        const text = child.value;
        const mentions = getPostTextLinks(text).filter((link) => link.href.startsWith('/'));
        const nodes: MarkdownNode[] = [];
        let cursor = 0;
        for (const mention of mentions) {
          if (cursor < mention.start) nodes.push({ type: 'text', value: text.slice(cursor, mention.start) });
          nodes.push({ type: 'link', url: mention.href, children: [{ type: 'text', value: mention.text }] });
          cursor = mention.end;
        }
        if (cursor < text.length) nodes.push({ type: 'text', value: text.slice(cursor) });
        return nodes;
      });
    }
    visit(tree);
  };
}
