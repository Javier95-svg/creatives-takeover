import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight } from 'lucide-react';
import type { JourneyDefinition } from '@/types/journey';
import { journeyRoutes } from '@/data/journeys';

interface JourneyCompletionCardProps {
  journey: JourneyDefinition;
}

export default function JourneyCompletionCard({ journey }: JourneyCompletionCardProps) {
  return (
    <Card className="border-success/20 bg-success/5">
      <CardContent className="p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
            <Trophy className="h-7 w-7 text-success" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold">Journey Complete!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You finished all {journey.totalDays} days of "{journey.title}".
          </p>
        </div>
        {journey.nextJourney && (
          <Button className="gap-2" asChild>
            <a href={journeyRoutes[journey.nextJourney]}>
              Start Next Journey
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
