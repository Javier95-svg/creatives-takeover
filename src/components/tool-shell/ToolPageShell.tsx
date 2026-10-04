import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// Page frame for the core founder tools (PMF Lab, Traction Engine, GTM
// Strategist). Founders said these pages looked machine-made: glowing
// wallpapers, gradient titles and a badge on every line. The shell keeps one
// calm header and leaves the content to say what to do next. Each tool brings
// its own identity through a theme class (its colour) and a quiet wallpaper
// that depicts what the tool does.

export type ToolTheme = 'pmf' | 'traction' | 'gtm';

interface ToolPageShellProps {
  title: string;
  /** One sentence on what the tool does for the founder. */
  purpose: string;
  /** Optional line naming what the work is about, e.g. the product and customer. */
  context?: ReactNode;
  /** Controls under the context line, such as a case selector. */
  actions?: ReactNode;
  /** Remaps primary to the tool's colour inside the page (see .tool-theme-* in index.css). */
  theme?: ToolTheme;
  /** The tool's own backdrop, drawn behind the header. */
  wallpaper?: ReactNode;
  /** A small illustration on the right of the header, from tablet width up. */
  headerArt?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ToolPageShell({ title, purpose, context, actions, theme, wallpaper, headerArt, children, className }: ToolPageShellProps) {
  return (
    // pt-28 clears the public navigation bar; inside the signed-in workspace,
    // nav-offset-roomy replaces it with a small gap under the workspace header.
    <section className={cn('nav-offset-roomy relative isolate overflow-hidden bg-background px-4 pb-20 pt-28 md:pt-32', theme && `tool-theme-${theme}`, className)}>
      {wallpaper}
      <div className="container relative mx-auto max-w-4xl">
        <header className="flex items-end justify-between gap-6 border-b border-border/60 pb-6">
          <div className="min-w-0 space-y-2">
            <h1 className="font-space-grotesk text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
            <p className="max-w-xl text-base text-muted-foreground">{purpose}</p>
            {context ? <div className="text-sm text-muted-foreground">{context}</div> : null}
            {actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
          </div>
          {headerArt ? <div className="hidden h-36 w-64 shrink-0 md:block lg:w-80">{headerArt}</div> : null}
        </header>
        <div className="mt-8 space-y-6">{children}</div>
      </div>
    </section>
  );
}
