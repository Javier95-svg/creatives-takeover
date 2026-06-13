import { CheckCircle2, Circle, Lock } from 'lucide-react';
import type { JourneyDay, DayStatus } from '@/types/journey';

interface JourneyTimelineProps {
  days: JourneyDay[];
  selectedDay: number;
  getDayStatus: (dayNumber: number) => DayStatus;
  onSelectDay: (dayNumber: number) => void;
}

const statusColors: Record<DayStatus, string> = {
  locked: 'border-muted bg-muted/50 text-muted-foreground',
  available: 'border-info bg-info/10 text-info',
  'in-progress': 'border-warning bg-warning/10 text-warning ring-2 ring-warning/20',
  completed: 'border-success bg-success/10 text-success',
};

const lineColors: Record<DayStatus, string> = {
  locked: 'bg-muted',
  available: 'bg-info/30',
  'in-progress': 'bg-warning/30',
  completed: 'bg-success',
};

export default function JourneyTimeline({ days, selectedDay, getDayStatus, onSelectDay }: JourneyTimelineProps) {
  const totalDays = days.length;
  const useCompactGrid = totalDays > 10;

  if (useCompactGrid) {
    return <CompactGrid days={days} selectedDay={selectedDay} getDayStatus={getDayStatus} onSelectDay={onSelectDay} />;
  }

  return <HorizontalTimeline days={days} selectedDay={selectedDay} getDayStatus={getDayStatus} onSelectDay={onSelectDay} />;
}

/** Horizontal timeline for 7-10 day journeys */
function HorizontalTimeline({ days, selectedDay, getDayStatus, onSelectDay }: JourneyTimelineProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-max px-4">
        {days.map((day, i) => {
          const status = getDayStatus(day.dayNumber);
          const isSelected = day.dayNumber === selectedDay;
          const isLast = i === days.length - 1;

          return (
            <div key={day.dayNumber} className="flex items-center">
              <button
                onClick={() => onSelectDay(day.dayNumber)}
                className={`flex flex-col items-center gap-1.5 group relative ${
                  status === 'locked' ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-xs font-bold transition-all ${
                    statusColors[status]
                  } ${isSelected ? 'scale-110 shadow-md' : 'group-hover:scale-105'}`}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : status === 'locked' ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    day.dayNumber
                  )}
                </div>
                <span
                  className={`text-caption max-w-[60px] text-center truncate ${
                    isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {day.title}
                </span>
              </button>

              {!isLast && (
                <div className={`w-8 h-0.5 mx-1 rounded-full ${lineColors[getDayStatus(day.dayNumber)]}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact grid for 14-30 day journeys, grouped by weeks */
function CompactGrid({ days, selectedDay, getDayStatus, onSelectDay }: JourneyTimelineProps) {
  const weeks: JourneyDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="space-y-3">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex}>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">
            Week {weekIndex + 1}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {week.map((day) => {
              const status = getDayStatus(day.dayNumber);
              const isSelected = day.dayNumber === selectedDay;

              return (
                <button
                  key={day.dayNumber}
                  onClick={() => onSelectDay(day.dayNumber)}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg border-2 text-xs font-bold transition-all ${
                    statusColors[status]
                  } ${isSelected ? 'scale-110 shadow-md' : 'hover:scale-105'} ${
                    status === 'locked' ? 'cursor-default' : 'cursor-pointer'
                  }`}
                  title={`Day ${day.dayNumber}: ${day.title}`}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : status === 'locked' ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    day.dayNumber
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
