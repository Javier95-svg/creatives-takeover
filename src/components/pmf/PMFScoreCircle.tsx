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
    verdict === 'ready' ? '#16a34a' :
    verdict === 'partial' ? '#d97706' :
    '#dc2626';

  const textColor =
    verdict === 'ready' ? 'text-green-600 dark:text-green-400' :
    verdict === 'partial' ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400';

  const badgeBg =
    verdict === 'ready' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' :
    verdict === 'partial' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' :
    'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';

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
