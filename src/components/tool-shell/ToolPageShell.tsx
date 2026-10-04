import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// Plain page frame for the core founder tools (PMF Lab, Traction Engine, GTM
// Strategist). Founders said these pages looked machine-made: glowing
// wallpapers, gradient titles and a badge on every line. The shell keeps one
// calm header and leaves the content to say what to do next.

interface ToolPageShellProps {
  title: string;
  /** One sentence on what the tool does for the founder. */
  purpose: string;
  /** Optional line naming what the work is about, e.g. the product and customer. */
  context?: ReactNode;
  /** Controls on the right of the header, such as a case selector. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ToolPageShell({ title, purpose, context, actions, children, className }: ToolPageShellProps) {
  return (
    // pt-28 clears the public navigation bar; inside the signed-in workspace,
    // nav-offset-roomy replaces it with a small gap under the workspace header.
    <section className={cn('nav-offset-roomy bg-background px-4 pb-20 pt-28 md:pt-32', className)}>
      <div className="container mx-auto max-w-4xl">
        <header className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="font-space-grotesk text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
            <p className="max-w-2xl text-base text-muted-foreground">{purpose}</p>
            {context ? <div className="text-sm text-muted-foreground">{context}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </header>
        <div className="mt-8 space-y-6">{children}</div>
      </div>
    </section>
  );
}
