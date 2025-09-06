import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen, TrendingUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SourcesDisplayProps {
  sources: string[];
  researchQuality: 'high' | 'medium' | 'low';
  className?: string;
}

const SourcesDisplay: React.FC<SourcesDisplayProps> = ({
  sources,
  researchQuality,
  className = ""
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const qualityConfig = {
    high: { color: 'bg-green-500/10 text-green-700 border-green-500/20', label: 'High Quality', icon: TrendingUp },
    medium: { color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', label: 'Medium Quality', icon: BookOpen },
    low: { color: 'bg-red-500/10 text-red-700 border-red-500/20', label: 'Limited Sources', icon: BookOpen }
  };

  const config = qualityConfig[researchQuality];
  const IconComponent = config.icon;

  if (!sources.length) {
    return (
      <Card className={`border-muted/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">No research sources available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-primary/20 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconComponent className="w-4 h-4" />
                Research Sources ({sources.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isOpen ? 'Hide' : 'Show'}
                </span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 p-4">
            <div className="space-y-2">
              {sources.map((source, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">
                      [{index + 1}]
                    </div>
                    <div className="text-sm truncate" title={source}>
                      {source}
                    </div>
                  </div>
                  {source.startsWith('http') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(source, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-3 p-2 bg-primary/5 rounded text-xs text-muted-foreground">
              💡 Sources are automatically verified and cited by our AI research system
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SourcesDisplay;