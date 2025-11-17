import { useState, useEffect } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialProofCounterProps {
  count: number;
  label: string;
  period?: 'last_hour' | 'today' | 'this_week';
  variant?: 'default' | 'compact' | 'badge';
  className?: string;
  animated?: boolean;
}

export const SocialProofCounter = ({
  count,
  label,
  period = 'today',
  variant = 'default',
  className,
  animated = true
}: SocialProofCounterProps) => {
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    if (!animated) {
      setDisplayCount(count);
      return;
    }

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = count / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const newValue = Math.min(Math.floor(increment * currentStep), count);
      setDisplayCount(newValue);

      if (currentStep >= steps || newValue >= count) {
        setDisplayCount(count);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [count, animated]);

  const formatCount = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1.5 text-sm text-muted-foreground', className)}>
        <Users className="w-3.5 h-3.5" />
        <span>
          <span className="font-semibold text-foreground">{formatCount(displayCount)}</span> {label}
        </span>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs', className)}>
        <TrendingUp className="w-3 h-3" />
        <span className="font-semibold">{formatCount(displayCount)}</span>
        <span>{label}</span>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="p-2 rounded-lg bg-primary/10">
        <Users className="w-5 h-5 text-primary" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {formatCount(displayCount)}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
};

// Mock data generator for demonstration
// In production, this would come from an API
export const generateSocialProofData = (): { count: number; period: 'last_hour' | 'today' | 'this_week' } => {
  // Simulate realistic numbers
  const baseCount = Math.floor(Math.random() * 50) + 20; // 20-70
  return {
    count: baseCount,
    period: 'today'
  };
};

