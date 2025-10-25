import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface QuickReplyButtonsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  currentStep?: number;
  questionKey?: string;
}

export const QuickReplyButtons = ({ 
  suggestions, 
  onSelect,
  currentStep,
  questionKey 
}: QuickReplyButtonsProps) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4 animate-fade-in">
      {suggestions.map((suggestion, index) => (
        <Button
          key={`${currentStep}-${questionKey}-${index}`}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion)}
          className="text-xs sm:text-sm rounded-full px-4 py-2 hover:scale-105 transition-all duration-200 bg-background/80 hover:bg-primary/10 hover:border-primary/50 border-border/50"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <MessageCircle className="h-3 w-3 mr-1.5" />
          {suggestion}
        </Button>
      ))}
    </div>
  );
};

// Context-aware suggestion generator
export const getQuickReplySuggestions = (
  questionKey: string,
  currentStep: number,
  userMessage?: string
): string[] => {
  // Don't show if user has already typed something substantial
  if (userMessage && userMessage.length > 20) return [];

  const suggestionMap: Record<string, string[]> = {
    // Step 1: Business Idea
    businessIdea: [
      "Not sure yet",
      "Need examples",
      "Tell me more about trends"
    ],
    
    // Step 2: Target Market
    targetMarket: [
      "Help me identify my audience",
      "Skip for now",
      "Need market research tips"
    ],
    
    // Step 3: Industry Selection
    industry: [
      "SaaS",
      "E-commerce",
      "Mobile App",
      "Service Business",
      "Content Creation",
      "Consulting"
    ],
    
    // Step 4: Problem Statement
    problem: [
      "Not sure of the exact problem",
      "Need help articulating it",
      "Show me examples"
    ],
    
    // Step 5: Solution
    solution: [
      "Still brainstorming",
      "Need validation",
      "Tell me more"
    ],
    
    // Step 6: Goals
    goals: [
      "Make it profitable",
      "Help people solve problems",
      "Build passive income",
      "Create impact"
    ],
    
    // General fallback
    default: [
      "Not sure yet",
      "Need examples",
      "Skip for now",
      "Tell me more"
    ]
  };

  return suggestionMap[questionKey] || suggestionMap.default;
};
