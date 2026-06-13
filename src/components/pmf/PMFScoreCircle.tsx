import React from 'react';
import { cn } from '@/lib/utils';

interface PMFScoreCircleProps {
  score: number;
  verdict: 'ready' | 'partial' | 'weak';
  verdictLabel: string;
}

const THRESHOLD = 75;

const PMFScoreCircle: React.FC<PMFScoreCircleProps> = ({ score, verdict, verdictLabel }) => {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  const color =
    verdict === 'ready' ? 'hsl(var(--success))' :
    verdict === 'partial' ? 'hsl(var(--warning))' :
    'hsl(var(--destructive))';

  const textColor =
    verdict === 'ready' ? 'text-success' :
    verdict === 'partial' ? 'text-warning' :
    'text-destructive';

  const badgeBg =
    verdict === 'ready' ? 'bg-success-subtle text-success border-success/30' :
    verdict === 'partial' ? 'bg-warning-subtle text-warning border-warning/30' :
    'bg-destructive-subtle text-destructive border-destructive/30';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-5xl font-black leading-none', textColor)}>{score}</span>
          <span className="text-xs text-muted-foreground font-medium mt-1">/ 100</span>
        </div>
      </div>

      {/* Threshold hint */}
      <p className="text-xs text-muted-foreground">
        Threshold: <span className="font-semibold text-foreground">{THRESHOLD} to build</span>
      </p>

      {/* Verdict badge */}
      <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border', badgeBg)}>
        {verdictLabel}
      </span>
    </div>
  );
};

export default PMFScoreCircle;
