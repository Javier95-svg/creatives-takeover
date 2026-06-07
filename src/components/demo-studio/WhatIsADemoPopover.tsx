import { HelpCircle, ImagePlus, MousePointerClick, Rocket } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Always-available definition of a "demo" so users never confuse it with a
 * landing page. Drop next to any "demo" heading.
 */
export default function WhatIsADemoPopover({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground',
            className,
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" /> What&apos;s a demo?
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="text-sm font-semibold">A demo is an interactive walkthrough</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A clickable, click-through tour of your product — built from screenshots with hotspots. Like a
          Supademo/Arcade tour or a clickable prototype.
        </p>
        <p className="mt-2 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">It is not a landing page.</strong> The landing page (headline + demo +
          pitch + signup) is your <span className="whitespace-nowrap">Launch Page</span> — coming next.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <ImagePlus className="h-3.5 w-3.5 shrink-0 text-primary" /> Upload screenshots → each is a step
          </li>
          <li className="flex items-center gap-2">
            <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-primary" /> Add clickable hotspots
          </li>
          <li className="flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5 shrink-0 text-primary" /> Publish a shareable link + embed
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
