import { useRef, type ClipboardEvent } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ArticleBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

type WrapAction = { kind: "wrap"; before: string; after: string; placeholder: string };
type LinePrefixAction = { kind: "line-prefix"; prefix: string; placeholder: string };
type OrderedAction = { kind: "ordered"; placeholder: string };
type ToolbarAction = WrapAction | LinePrefixAction | OrderedAction;

interface ToolbarButton {
  icon: typeof Bold;
  label: string;
  action: ToolbarAction;
}

const TOOLBAR_GROUPS: ToolbarButton[][] = [
  [
    { icon: Bold, label: "Bold", action: { kind: "wrap", before: "**", after: "**", placeholder: "bold text" } },
    { icon: Italic, label: "Italic", action: { kind: "wrap", before: "_", after: "_", placeholder: "italic text" } },
    { icon: Strikethrough, label: "Strikethrough", action: { kind: "wrap", before: "~~", after: "~~", placeholder: "struck text" } },
  ],
  [
    { icon: Heading2, label: "Heading", action: { kind: "line-prefix", prefix: "## ", placeholder: "Section heading" } },
    { icon: Heading3, label: "Subheading", action: { kind: "line-prefix", prefix: "### ", placeholder: "Subheading" } },
    { icon: Quote, label: "Quote", action: { kind: "line-prefix", prefix: "> ", placeholder: "Quote" } },
  ],
  [
    { icon: List, label: "Bullet list", action: { kind: "line-prefix", prefix: "- ", placeholder: "List item" } },
    { icon: ListOrdered, label: "Numbered list", action: { kind: "ordered", placeholder: "List item" } },
    { icon: Code, label: "Inline code", action: { kind: "wrap", before: "`", after: "`", placeholder: "code" } },
    { icon: LinkIcon, label: "Link", action: { kind: "wrap", before: "[", after: "](https://)", placeholder: "link text" } },
  ],
];

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Convert pasted rich text (HTML from Docs, Word, LinkedIn, etc.) into Markdown
 * so bold, headings, lists, links and quotes survive the paste instead of being
 * flattened to plain text. Falls back to plain text when no HTML is available.
 */
function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const inlineWrap = (node: Node, marker: string): string => {
    const inner = serializeChildren(node).trim();
    return inner ? `${marker}${inner}${marker}` : "";
  };

  const serializeChildren = (node: Node): string =>
    Array.from(node.childNodes).map(serialize).join("");

  const serialize = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").replace(/\s+/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case "strong":
      case "b":
        return inlineWrap(el, "**");
      case "em":
      case "i":
        return inlineWrap(el, "_");
      case "s":
      case "del":
      case "strike":
        return inlineWrap(el, "~~");
      case "code":
        return inlineWrap(el, "`");
      case "br":
        return "\n";
      case "a": {
        const text = serializeChildren(el).trim();
        const href = el.getAttribute("href") ?? "";
        return href ? `[${text || href}](${href})` : text;
      }
      case "h1":
        return `\n\n# ${serializeChildren(el).trim()}\n\n`;
      case "h2":
        return `\n\n## ${serializeChildren(el).trim()}\n\n`;
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return `\n\n### ${serializeChildren(el).trim()}\n\n`;
      case "blockquote":
        return `\n\n> ${serializeChildren(el).trim().replace(/\n+/g, "\n> ")}\n\n`;
      case "li": {
        const ordered = el.parentElement?.tagName.toLowerCase() === "ol";
        const marker = ordered ? "1. " : "- ";
        return `${marker}${serializeChildren(el).trim()}\n`;
      }
      case "ul":
      case "ol":
        return `\n${serializeChildren(el)}\n`;
      case "p":
      case "div":
        return `\n\n${serializeChildren(el).trim()}\n\n`;
      default:
        return serializeChildren(el);
    }
  };

  return serialize(doc.body)
    .replace(/\n{3,}/g, "\n\n") // collapse excess blank lines
    .replace(/[ \t]+\n/g, "\n") // trim trailing spaces on lines
    .trim();
}

export function ArticleBodyEditor({ value, onChange, placeholder, className }: ArticleBodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);

    let nextValue: string;
    let nextCursorStart: number;
    let nextCursorEnd: number;

    if (action.kind === "wrap") {
      const inner = selected || action.placeholder;
      const insertion = `${action.before}${inner}${action.after}`;
      nextValue = value.slice(0, start) + insertion + value.slice(end);
      nextCursorStart = start + action.before.length;
      nextCursorEnd = nextCursorStart + inner.length;
    } else {
      // Apply a prefix to each selected line (or the current line if no selection).
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end) || action.placeholder;
      const lines = block.split("\n");
      const prefixed = lines
        .map((line, index) => {
          const prefix = action.kind === "ordered" ? `${index + 1}. ` : action.prefix;
          return line.length === 0 && lines.length === 1 ? `${prefix}${action.placeholder}` : `${prefix}${line}`;
        })
        .join("\n");
      nextValue = value.slice(0, lineStart) + prefixed + value.slice(end);
      nextCursorStart = lineStart;
      nextCursorEnd = lineStart + prefixed.length;
    }

    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursorStart, nextCursorEnd);
    });
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const html = event.clipboardData.getData("text/html");
    if (!html) return; // plain-text paste: let the browser handle it normally

    const markdown = htmlToMarkdown(html);
    if (!markdown) return;

    event.preventDefault();
    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = value.slice(0, start) + markdown + value.slice(end);
    const nextCursor = start + markdown.length;

    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const words = countWords(value);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-background", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        {TOOLBAR_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-0.5">
            {groupIndex > 0 && <Separator orientation="vertical" className="mx-1 h-5" />}
            {group.map((button) => (
              <Button
                key={button.label}
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title={button.label}
                aria-label={button.label}
                onClick={() => applyAction(button.action)}
              >
                <button.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        ))}
        <span className="ml-auto pr-2 text-xs text-muted-foreground">
          {words} {words === 1 ? "word" : "words"}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder ?? "Start writing your article. Paste your text here — use the toolbar to format headings, quotes, and lists."}
        spellCheck
        className="min-h-[480px] w-full resize-y border-0 bg-transparent px-5 py-4 text-base leading-8 text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
      />

      {/* Footer hint */}
      <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        Paste from Docs, Word or LinkedIn and bold, headings, lists and links are kept automatically. Formatting uses Markdown — or wrap selections with the toolbar above.
      </div>
    </div>
  );
}
