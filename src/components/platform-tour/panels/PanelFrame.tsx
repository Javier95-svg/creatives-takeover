import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * Shared chrome for every panel except Pulse, which renders full bleed exactly
 * as it does in production. The shell already shortens itself by the frame bar's
 * measured height, so this only needs ordinary bottom padding.
 */
export function PanelFrame({ eyebrow, title, lede, children }: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return <div className="mx-auto w-full max-w-5xl px-6 pb-12 pt-8 lg:px-10">
    <header className="mb-8">
      {eyebrow && <Badge variant="outline" className="mb-3">{eyebrow}</Badge>}
      <h1 className="text-headline-lg font-semibold text-foreground">{title}</h1>
      {lede && <p className="mt-3 max-w-2xl text-body text-muted-foreground">{lede}</p>}
    </header>
    {children}
  </div>;
}
