import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, TrendingUp, Users } from "lucide-react";

interface ResearchControlsProps {
  researchEnabled: boolean;
  onResearchToggle: (enabled: boolean) => void;
  researchDepth: 'basic' | 'comprehensive' | 'expert';
  onDepthChange: (depth: 'basic' | 'comprehensive' | 'expert') => void;
  creditCost: number;
}

const ResearchControls: React.FC<ResearchControlsProps> = ({
  researchEnabled,
  onResearchToggle,
  researchDepth,
  onDepthChange,
  creditCost
}) => {
  const depthOptions = [
    { 
      value: 'basic', 
      label: 'Basic Research', 
      description: 'Quick market overview',
      icon: Search,
      credits: 1
    },
    { 
      value: 'comprehensive', 
      label: 'Comprehensive Research', 
      description: 'Detailed market analysis with citations',
      icon: TrendingUp,
      credits: 3
    },
    { 
      value: 'expert', 
      label: 'Expert Research', 
      description: 'Deep industry intelligence with extensive sources',
      icon: Users,
      credits: 5
    }
  ];

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="font-medium text-sm">AI Market Research</div>
            <div className="text-xs text-muted-foreground">
              Get real-time market insights with citations
            </div>
          </div>
          <Switch
            checked={researchEnabled}
            onCheckedChange={onResearchToggle}
          />
        </div>

        {researchEnabled && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Research Depth</div>
            <Select value={researchDepth} onValueChange={onDepthChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {depthOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description} • {option.credits} credits
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <div className="text-xs text-muted-foreground bg-primary/10 p-2 rounded">
              💡 Total cost: {creditCost} credits (includes research + report generation)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResearchControls;