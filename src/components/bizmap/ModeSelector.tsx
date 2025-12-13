import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Search, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMode = "strategy" | "research" | "analysis" | "planning";

interface ModeSelectorProps {
  value: ChatMode;
  onValueChange: (mode: ChatMode) => void;
  className?: string;
}

const modes: Array<{
  value: ChatMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    value: "strategy",
    label: "Strategy",
    icon: Target,
    description: "Strategic planning and high-level decisions"
  },
  {
    value: "research",
    label: "Research",
    icon: Search,
    description: "Market research with citations"
  },
  {
    value: "analysis",
    label: "Analysis",
    icon: BarChart3,
    description: "Deep analytical insights"
  },
  {
    value: "planning",
    label: "Planning",
    icon: Calendar,
    description: "Action-oriented step-by-step planning"
  }
];

export const ModeSelector = ({ value, onValueChange, className }: ModeSelectorProps) => {
  const selectedMode = modes.find(m => m.value === value) || modes[0];
  const Icon = selectedMode.icon;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger 
        className={cn(
          "w-[160px] sm:w-[180px] h-11 bg-background/80 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200",
          className
        )}
        aria-label="Select AI mode"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          <SelectValue>
            <span className="text-sm font-medium">{selectedMode.label}</span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {modes.map((mode) => {
          const ModeIcon = mode.icon;
          return (
            <SelectItem key={mode.value} value={mode.value}>
              <div className="flex items-center gap-3 py-1">
                <ModeIcon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{mode.label}</span>
                  <span className="text-xs text-muted-foreground">{mode.description}</span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

