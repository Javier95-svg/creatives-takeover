import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  'Reading your validation evidence…',
  'Evaluating pain clarity and urgency…',
  'Measuring consistency and demand signals…',
  'Generating your PMF readiness score…',
];

const PMFScoringLoader: React.FC = () => {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);

  useEffect(() => {
    STEPS.forEach((_, i) => {
      const t = setTimeout(() => setVisibleSteps(prev => [...prev, i]), i * 1800);
      return () => clearTimeout(t);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center max-w-md mx-auto">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Evaluating your evidence</h2>
        <p className="text-sm text-muted-foreground">Usually takes 10–15 seconds</p>
      </div>
      <div className="space-y-3 w-full text-left">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 transition-all duration-500',
              visibleSteps.includes(i) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4',
            )}
          >
            <div className={cn(
              'w-2 h-2 rounded-full shrink-0 transition-colors duration-300',
              visibleSteps.includes(i + 1) || (i === STEPS.length - 1 && visibleSteps.includes(i))
                ? 'bg-primary'
                : visibleSteps.includes(i)
                ? 'bg-primary/50 animate-pulse'
                : 'bg-muted',
            )} />
            <p className={cn(
              'text-sm transition-colors duration-300',
              visibleSteps.includes(i) ? 'text-foreground' : 'text-muted-foreground',
            )}>
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PMFScoringLoader;
