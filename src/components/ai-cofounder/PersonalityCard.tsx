import { PersonalityType } from '@/types/personality';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface PersonalityCardProps {
  personality: PersonalityType;
  selected: boolean;
  onSelect: () => void;
}

export const PersonalityCard = ({ personality, selected, onSelect }: PersonalityCardProps) => {
  return (
    <Card
      className={`relative cursor-pointer transition-all duration-300 hover:scale-105 p-6 ${
        selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      {selected && (
        <div className="absolute top-4 right-4 bg-primary text-primary-foreground rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
      
      <div className="flex flex-col items-center text-center space-y-4">
        <div className={`text-6xl bg-gradient-to-br ${personality.color} bg-clip-text`}>
          {personality.avatar}
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-2">{personality.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{personality.description}</p>
          <p className="text-xs text-muted-foreground italic mb-3">
            Tone: {personality.tone}
          </p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3 w-full">
          <p className="text-sm italic">"{personality.example}"</p>
        </div>
      </div>
    </Card>
  );
};
