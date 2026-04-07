import { Badge } from '@/components/ui/badge';
import { Compass } from 'lucide-react';
import type { DashboardModeVariant } from '@/config/planPermissions';

export type DashboardMode = DashboardModeVariant;

interface ModeToggleProps {
  currentMode: DashboardMode;
}

const MODE_COPY: Record<DashboardMode, { label: string; description: string }> = {
  rookie: { label: 'Rookie Mode', description: 'Guided and simplified' },
  starter: { label: 'Starter Mode', description: 'Structured and progressing' },
  rising: { label: 'Rising Mode', description: 'Operational and productive' },
  pro: { label: 'Pro Mode', description: 'Strategic and data-rich' },
};

export function ModeToggle({ currentMode }: ModeToggleProps) {
  const copy = MODE_COPY[currentMode];

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 text-sm">
      <Compass className="h-4 w-4 text-primary" />
      <div className="flex items-center gap-2">
        <span className="font-medium">{copy.label}</span>
        <Badge variant="outline" className="hidden sm:inline-flex">{copy.description}</Badge>
      </div>
    </div>
  );
}
