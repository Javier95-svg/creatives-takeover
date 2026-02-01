import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';
import type { JourneyDefinition } from '@/types/journey';
import JourneyProgressBar from './JourneyProgressBar';

interface JourneyHeroProps {
  journey: JourneyDefinition;
  started: boolean;
  completionPercent: number;
  currentDay: number;
  onStart: () => void;
  onReset: () => void;
}

export default function JourneyHero({
  journey,
  started,
  completionPercent,
  currentDay,
  onStart,
  onReset,
}: JourneyHeroProps) {
  const isComplete = completionPercent === 100;

  return (
    <div className="text-center space-y-5">
      <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
        {journey.totalDays}-Day Journey
      </Badge>

      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold takeover-gradient creatives-font">
        {journey.title}
      </h1>

      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{journey.tagline}</p>

      {started ? (
        <div className="max-w-md mx-auto space-y-3">
          <JourneyProgressBar
            completionPercent={completionPercent}
            currentDay={currentDay}
            totalDays={journey.totalDays}
          />
          <div className="flex items-center justify-center gap-2">
            {isComplete && journey.nextJourney && (
              <Button asChild>
                <a href={`/journeys/${journey.nextJourney}`}>
                  Start Next Journey
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={onReset}>
              <RotateCcw className="h-3 w-3" />
              Reset Journey
            </Button>
          </div>
        </div>
      ) : (
        <Button size="lg" className="gap-2" onClick={onStart}>
          <Play className="h-4 w-4" />
          Start {journey.totalDays}-Day Sprint
        </Button>
      )}
    </div>
  );
}
