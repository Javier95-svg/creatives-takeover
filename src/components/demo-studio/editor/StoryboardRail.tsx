import { FileText, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DemoStudioStoryboardStep } from '@/lib/demoStudio/types';

interface StoryboardRailProps {
  storyboard: DemoStudioStoryboardStep[];
  disabled?: boolean;
  onApply: () => void;
}

export default function StoryboardRail({ storyboard, disabled, onApply }: StoryboardRailProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Storyboard
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Apply AI steps, then attach screenshots.
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onApply} disabled={disabled || storyboard.length === 0}>
          <Wand2 className="h-4 w-4" /> Apply
        </Button>
      </div>
      {storyboard.length ? (
        <div className="mt-3 space-y-2">
          {storyboard.slice(0, 7).map((step, index) => (
            <div key={`${step.title}-${index}`} className="rounded-lg bg-muted/40 p-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{index + 1}</Badge>
                <p className="truncate text-xs font-medium">{step.title}</p>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{step.caption}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Generate a brief first to see suggested demo steps here.
        </p>
      )}
    </div>
  );
}
