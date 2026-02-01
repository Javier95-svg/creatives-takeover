import { Card, CardContent } from '@/components/ui/card';
import { Quote } from 'lucide-react';
import type { FounderExample } from '@/types/journey';

interface FounderExampleCardProps {
  example: FounderExample;
}

export default function FounderExampleCard({ example }: FounderExampleCardProps) {
  return (
    <Card className="border-primary/10 bg-primary/5">
      <CardContent className="p-4 space-y-2">
        <Quote className="h-4 w-4 text-primary/50" />
        <blockquote className="text-sm italic text-foreground/80 leading-relaxed">
          "{example.quote}"
        </blockquote>
        <p className="text-xs text-muted-foreground">
          {example.founderName ? `— ${example.founderName}, ` : '— '}
          {example.company}
        </p>
        <p className="text-xs font-medium text-primary/80 pt-1">
          Lesson: {example.lesson}
        </p>
      </CardContent>
    </Card>
  );
}
