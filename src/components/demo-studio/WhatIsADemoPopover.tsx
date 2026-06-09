import { HelpCircle, ImagePlus, MousePointerClick, Rocket } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
          A clickable product tour built from screenshots, captions, and hotspots. It shows the aha moment before
          a founder has a polished product video or full sales site.
        </p>
        <p className="mt-2 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">It is not the whole launch page.</strong> Demo Studio combines this
          walkthrough with your VSL and signup form on a public <span className="whitespace-nowrap">Launch Page</span>.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <ImagePlus className="h-3.5 w-3.5 shrink-0 text-primary" /> Upload screenshots or apply a storyboard
          </li>
          <li className="flex items-center gap-2">
            <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-primary" /> Add clickable hotspots
          </li>
          <li className="flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5 shrink-0 text-primary" /> Publish demo + VSL + signup page
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
