import { AIPersonality, PERSONALITY_TYPES } from '@/types/personality';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface PersonalityIndicatorProps {
  personality: AIPersonality;
  size?: 'sm' | 'md' | 'lg';
}

export const PersonalityIndicator = ({ personality, size = 'md' }: PersonalityIndicatorProps) => {
  const personalityData = PERSONALITY_TYPES[personality];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="secondary" 
          className={`${sizeClasses[size]} cursor-help bg-gradient-to-r ${personalityData.color} text-white border-0`}
        >
          <span className="mr-1.5">{personalityData.avatar}</span>
          {personalityData.name}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <div className="space-y-2">
          <p className="font-semibold">{personalityData.name}</p>
          <p className="text-sm text-muted-foreground">{personalityData.description}</p>
          <p className="text-xs italic">Tone: {personalityData.tone}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
