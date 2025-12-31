import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Target, LayoutDashboard, Settings2, Check } from 'lucide-react';

export type DashboardMode = 'focus' | 'dashboard' | 'control_center';

interface ModeToggleProps {
  currentMode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  const modes: { value: DashboardMode; label: string; description: string; icon: typeof Target }[] = [
    {
      value: 'focus',
      label: 'Focus Mode',
      description: 'One clear priority + key metrics',
      icon: Target,
    },
    {
      value: 'dashboard',
      label: 'Dashboard Mode',
      description: 'Overview + active projects',
      icon: LayoutDashboard,
    },
    {
      value: 'control_center',
      label: 'Control Center',
      description: 'Full view with all widgets',
      icon: Settings2,
    },
  ];

  const currentModeConfig = modes.find((m) => m.value === currentMode);
  const CurrentIcon = currentModeConfig?.icon || Target;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{currentModeConfig?.label || 'Focus Mode'}</span>
          <span className="sm:hidden">Mode</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Dashboard View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.value;

          return (
            <DropdownMenuItem
              key={mode.value}
              onClick={() => onModeChange(mode.value)}
              className="flex items-start gap-3 py-3 cursor-pointer"
            >
              <Icon className={`h-4 w-4 mt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                    {mode.label}
                  </p>
                  {isActive && <Check className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mode.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
