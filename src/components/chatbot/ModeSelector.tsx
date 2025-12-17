import { FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ChatMode = 'planning' | 'gtm';

interface ModeSelectorProps {
  activeMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export const ModeSelector = ({ activeMode, onModeChange }: ModeSelectorProps) => {
  const modes: Array<{
    id: ChatMode;
    label: string;
    icon: typeof FileText;
    tooltip: string;
  }> = [
    {
      id: 'planning',
      label: 'Planning',
      icon: FileText,
      tooltip: 'Business Planning mode helps you define, structure, and refine your business plans. Get guidance on market analysis, value proposition, revenue models, and operational planning.'
    },
    {
      id: 'gtm',
      label: 'Go-To-Market',
      icon: Target,
      tooltip: 'Go-To-Market mode helps you plan and execute your market entry strategy. Get guidance on customer segmentation, target personas, positioning, pricing, distribution channels, marketing tactics, launch planning, and KPIs.'
    }
  ];

  return (
    <TooltipProvider>
      <div className="relative w-full">
        {/* Horizontal scrolling container with proper padding to prevent clipping */}
        <div className="overflow-x-auto scrollbar-hide scroll-smooth px-1 -mx-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border/50 min-w-fit">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.id;
              
              return (
                <Tooltip key={mode.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onModeChange(mode.id)}
                      className={cn(
                        "flex items-center justify-center gap-2 h-9 px-4 whitespace-nowrap transition-all duration-200 flex-shrink-0 min-w-fit",
                        isActive
                          ? "bg-background text-foreground shadow-sm border border-border/50"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                      aria-pressed={isActive}
                      aria-label={`${mode.label} mode${isActive ? ' (active)' : ''}`}
                    >
                      <Icon className={cn(
                        "h-4 w-4 transition-colors flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className="text-sm font-medium">{mode.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs p-3 text-sm bg-popover border border-border shadow-lg"
                  >
                    <p>{mode.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

