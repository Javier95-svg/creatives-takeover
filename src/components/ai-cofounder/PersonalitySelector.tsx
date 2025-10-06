import { useState } from 'react';
import { AIPersonality, PERSONALITY_TYPES } from '@/types/personality';
import { PersonalityCard } from './PersonalityCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface PersonalitySelectorProps {
  onSelect: (personality: AIPersonality) => void;
  currentPersonality?: AIPersonality;
}

export const PersonalitySelector = ({ onSelect, currentPersonality }: PersonalitySelectorProps) => {
  const [selected, setSelected] = useState<AIPersonality | undefined>(currentPersonality);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choose Your AI Co-Founder</h2>
        <p className="text-muted-foreground">
          Select the personality that resonates with you. You can change this anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(PERSONALITY_TYPES).map((personality) => (
          <PersonalityCard
            key={personality.id}
            personality={personality}
            selected={selected === personality.id}
            onSelect={() => setSelected(personality.id)}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleConfirm}
          disabled={!selected}
          className="min-w-[200px]"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
