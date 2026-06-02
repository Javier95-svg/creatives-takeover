import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

import { normalizeArticleMarkdown } from "@/lib/articleContent";

interface ArticleBodyProps {
  content: string | null | undefined;
  /** Used as image alt fallback. */
  title?: string;
  className?: string;
}

/**
 * Renders article Markdown with explicit reading typography.
 *
 * The project's `prose` classes do not apply (the @tailwindcss/typography plugin
 * is not registered), so paragraph spacing and heading sizes are styled here
 * directly. This keeps the article readable without enabling the plugin
 * site-wide. Shared by the public article page and the admin editor preview so
 * both look identical.
 */
export function ArticleBody({ content, title, className }: ArticleBodyProps) {
  const markdown = normalizeArticleMarkdown(content);

  return (
    <div className={`max-w-none text-foreground ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ node, ...props }) => (
            <p className="mb-6 text-lg leading-8 text-foreground/90" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="mt-12 mb-5 text-3xl md:text-4xl font-bold tracking-tight" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mt-12 mb-4 text-2xl md:text-3xl font-bold tracking-tight" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mt-8 mb-3 text-xl md:text-2xl font-semibold tracking-tight" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="mt-6 mb-2 text-lg md:text-xl font-semibold" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="mb-6 list-disc space-y-2 pl-6 text-lg leading-8" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="mb-6 list-decimal space-y-2 pl-6 text-lg leading-8" {...props} />
          ),
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="my-8 border-l-4 border-primary pl-5 text-lg italic leading-8 text-foreground/80"
              {...props}
            />
          ),
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            />
          ),
          strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          code: ({ node, ...props }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre className="my-6 overflow-auto rounded-lg bg-muted p-4 text-sm" {...props} />
          ),
          hr: ({ node, ...props }) => <hr className="my-10 border-border" {...props} />,
          img: ({ node, ...props }) => (
            <img
              {...props}
              className="my-6 h-auto max-w-full rounded-lg"
              alt={props.alt || title || ""}
              loading="lazy"
            />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
