/**
 * Quick Action Buttons
 * Shows AI-suggested actions based on context
 */

import { useProactiveSuggestions } from '@/hooks/useEnhancedContext';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface QuickActionsProps {
  onActionClick: (prompt: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  const { suggestions, isLoading } = useProactiveSuggestions();

  if (isLoading || suggestions.length === 0) return null;

  // Show top 2 suggestions only
  const topSuggestions = suggestions.slice(0, 2);

  // Convert suggestions to quick action prompts
  const getPromptFromSuggestion = (suggestion: typeof suggestions[0]): string => {
    switch (suggestion.type) {
      case 'milestone':
        return `Help me get started with ${suggestion.actionData?.milestoneType?.replace(/_/g, ' ')}`;
      case 'blocker':
        return `I'm stuck on: ${suggestion.title}. Can you help me resolve this?`;
      case 'profile':
        return 'Help me complete my founder profile';
      case 'decision':
        return 'I need help making a decision';
      default:
        return suggestion.title;
    }
  };

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Lightbulb className="h-3 w-3" />
        <span>Suggested:</span>
      </div>
      {topSuggestions.map((suggestion, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => onActionClick(getPromptFromSuggestion(suggestion))}
        >
          {suggestion.title.length > 40
            ? suggestion.title.substring(0, 40) + '...'
            : suggestion.title
          }
        </Button>
      ))}
    </div>
  );
}
