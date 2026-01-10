import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

export const BuilderHero: React.FC = () => {
  return (
    <div className="text-center space-y-4">
      <Badge className="bg-primary/10 text-primary border-primary/20">
        <Lightbulb className="h-3 w-3 mr-2" />
        Build Your Deck
      </Badge>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold takeover-gradient creatives-font">
        Pitch Deck Builder
      </h2>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Professional templates, proven frameworks, and interactive tools to create investor-ready pitch decks.
      </p>
    </div>
  );
};
