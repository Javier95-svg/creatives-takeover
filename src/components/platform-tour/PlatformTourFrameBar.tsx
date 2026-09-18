import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appendReturnParam } from '@/lib/authRedirect';
import { TOUR_PANELS, type TourPanel } from '@/lib/platformTour/tourPanels';

/**
 * Rendered as a sibling of WorkspaceLayout, never inside it. The route region
 * sets contain: layout paint, which makes it the containing block for any fixed
 * child and would trap this bar inside the scrolling panel. z-40 clears the
 * sidebar at 30 and the header at 20 while staying under Radix overlays at 50.
 */
export function PlatformTourFrameBar({ panel, onSelect }: {
  panel: TourPanel;
  onSelect: (key: string) => void;
}) {
  const index = TOUR_PANELS.findIndex((item) => item.key === panel.key);
  const previous = TOUR_PANELS[index - 1];
  const next = TOUR_PANELS[index + 1];
  // Publish the real height so the shell can shorten itself by exactly that
  // much. The bar wraps to two or three rows on narrow screens, and a guessed
  // value would be wrong on the widths where reaching the composer matters most.
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const publish = () => document.documentElement.style.setProperty('--platform-tour-bar', `${element.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--platform-tour-bar'); };
  }, []);
  return <div ref={bar} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          You are touring Creatives Takeover with a sample founder account.
        </p>
        <p className="truncate text-xs text-muted-foreground">Nothing here is saved.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label={previous ? `Back to ${previous.label}` : 'Back'}
          disabled={!previous} onClick={() => previous && onSelect(previous.key)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={next ? `Next, ${next.label}` : 'Next'}
          disabled={!next} onClick={() => next && onSelect(next.key)}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button asChild size="sm">
          <Link to={appendReturnParam('/signup', '/demo')}>Create your free account</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link to="/">Exit tour</Link>
        </Button>
      </div>
    </div>
  </div>;
}
