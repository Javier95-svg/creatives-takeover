import { Search, Hammer, BarChart3, ArrowRight, RotateCcw } from 'lucide-react';
import type { Phase } from '@/store/leanStartupStore';

interface LeanStartupCycleProps {
  currentPhase: Phase;
}

const phases: { phase: Phase; label: string; icon: typeof Search }[] = [
  { phase: 'learn', label: 'Learn', icon: Search },
  { phase: 'build', label: 'Build', icon: Hammer },
  { phase: 'measure', label: 'Measure', icon: BarChart3 },
];

export default function LeanStartupCycle({ currentPhase }: LeanStartupCycleProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {phases.map((p, i) => {
        const Icon = p.icon;
        const isActive = p.phase === currentPhase;

        return (
          <div key={p.phase} className="flex items-center gap-2 sm:gap-3">
            {/* Phase circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted-foreground/30 bg-muted/30 text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                {isActive && (
                  <span className="absolute inset-0 rounded-full animate-ping border-2 border-primary opacity-20" />
                )}
              </div>
              <span
                className={`text-caption sm:text-xs font-medium ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {p.label}
              </span>
            </div>

            {/* Arrow between phases */}
            {i < phases.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 -mt-4" />
            )}

            {/* Loop-back arrow after last phase */}
            {i === phases.length - 1 && (
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground/40 -mt-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}
