import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endDate: string; // ISO 8601 format
  onExpire?: () => void;
  variant?: 'compact' | 'full' | 'badge';
  className?: string;
  showIcon?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export const CountdownTimer = ({
  endDate,
  onExpire,
  variant = 'full',
  className,
  showIcon = true
}: CountdownTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = (): TimeRemaining | null => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference <= 0) {
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        total: difference
      };
    };

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      
      if (!remaining) {
        setTimeRemaining(null);
        setExpired(true);
        if (onExpire) {
          onExpire();
        }
        return;
      }

      setTimeRemaining(remaining);
    };

    // Initial calculation
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endDate, onExpire]);

  if (expired || !timeRemaining) {
    return null;
  }

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1 text-sm font-medium', className)}>
        {showIcon && <Clock className="w-3.5 h-3.5" />}
        <span>
          {timeRemaining.days > 0 && `${timeRemaining.days}d `}
          {formatNumber(timeRemaining.hours)}:{formatNumber(timeRemaining.minutes)}:{formatNumber(timeRemaining.seconds)}
        </span>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold', className)}>
        {showIcon && <Clock className="w-3 h-3" />}
        <span>
          {timeRemaining.days > 0 && `${timeRemaining.days}d `}
          {formatNumber(timeRemaining.hours)}h {formatNumber(timeRemaining.minutes)}m
        </span>
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {showIcon && <Clock className="w-5 h-5 text-primary" />}
      <div className="flex items-center gap-3">
        {timeRemaining.days > 0 && (
          <div className="flex flex-col items-center">
            <div className="text-2xl md:text-3xl font-bold text-primary tabular-nums">
              {formatNumber(timeRemaining.days)}
            </div>
            <div className="text-xs text-muted-foreground uppercase">Days</div>
          </div>
        )}
        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-3xl font-bold text-primary tabular-nums">
            {formatNumber(timeRemaining.hours)}
          </div>
          <div className="text-xs text-muted-foreground uppercase">Hours</div>
        </div>
        <div className="text-primary/50 text-xl">:</div>
        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-3xl font-bold text-primary tabular-nums">
            {formatNumber(timeRemaining.minutes)}
          </div>
          <div className="text-xs text-muted-foreground uppercase">Minutes</div>
        </div>
        <div className="text-primary/50 text-xl">:</div>
        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-3xl font-bold text-primary tabular-nums animate-pulse">
            {formatNumber(timeRemaining.seconds)}
          </div>
          <div className="text-xs text-muted-foreground uppercase">Seconds</div>
        </div>
      </div>
    </div>
  );
};

