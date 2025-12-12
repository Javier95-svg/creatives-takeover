import React from 'react';
import { AIMode, MODE_CONFIGURATIONS } from '@/types/aiMode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Check, Lock, ChevronDown } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AIMode;
  availableModes: AIMode[];
  onModeChange: (mode: AIMode) => void;
  strategyProgress?: {
    currentStep: number;
    completedSteps: number[];
    completionStatus: 'not_started' | 'in_progress' | 'completed';
  } | null;
  className?: string;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  availableModes,
  onModeChange,
  strategyProgress,
  className = '',
}) => {
  const currentConfig = MODE_CONFIGURATIONS[currentMode];
  const hasCompletedStrategy = strategyProgress?.completionStatus === 'completed';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${className}`}
        >
          <span>{currentConfig.icon}</span>
          <span className="font-medium">{currentConfig.displayName}</span>
          {currentMode === 'strategy' && strategyProgress && (
            <Badge variant="secondary" className="ml-1">
              Step {strategyProgress.currentStep + 1}/7
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch Mode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {Object.values(MODE_CONFIGURATIONS).map((config) => {
          const isAvailable = availableModes.includes(config.mode);
          const isCurrent = config.mode === currentMode;
          const isLocked = !isAvailable;
          
          // Show lock status for Business Mode if Strategy not completed
          const showLock = config.mode === 'business' && !hasCompletedStrategy;

          return (
            <DropdownMenuItem
              key={config.mode}
              onClick={() => isAvailable && onModeChange(config.mode)}
              disabled={isLocked}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg">{config.icon}</span>
                <div className="flex flex-col">
                  <span className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                    {config.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {config.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isCurrent && <Check className="h-4 w-4 text-primary" />}
                {showLock && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
            </DropdownMenuItem>
          );
        })}

        {!hasCompletedStrategy && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              💡 Complete Strategy Mode to unlock all features
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

