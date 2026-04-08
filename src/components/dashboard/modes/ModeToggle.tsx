import { Badge } from '@/components/ui/badge';
import { Compass } from 'lucide-react';
import { getDashboardModeConfig, type DashboardModeVariant } from '@/config/planPermissions';

export type DashboardMode = DashboardModeVariant;

interface ModeToggleProps {
  currentMode: DashboardMode;
}

export function ModeToggle({ currentMode }: ModeToggleProps) {
  const modeConfig = getDashboardModeConfig(currentMode);

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 text-sm">
      <Compass className="h-4 w-4 text-primary" />
      <div className="flex items-center gap-2">
        <span className="font-medium">{modeConfig.label}</span>
        <Badge variant="outline" className="hidden sm:inline-flex">{modeConfig.badgeDescription}</Badge>
      </div>
    </div>
  );
}
