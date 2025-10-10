import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Bot, Lightbulb, TrendingUp, Users, Check, Clock } from "lucide-react";

interface DemoControlPanelProps {
  currentService: 'overview' | 'bizmap' | 'prompts' | 'insighta' | 'community';
  servicesExplored: string[];
  onNavigate: (service: 'overview' | 'bizmap' | 'prompts' | 'insighta' | 'community') => void;
  onReset: () => void;
  timeSpent?: number;
  completionRate?: number;
}

const DemoControlPanel = ({ 
  currentService, 
  servicesExplored, 
  onNavigate, 
  onReset,
  timeSpent = 0,
  completionRate = 0
}: DemoControlPanelProps) => {
  const services = [
    { id: 'bizmap' as const, label: 'BizMap AI', icon: Bot },
    { id: 'prompts' as const, label: 'Prompt Library', icon: Lightbulb },
    { id: 'insighta' as const, label: 'Insighta', icon: TrendingUp },
    { id: 'community' as const, label: 'Community', icon: Users }
  ];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const allServicesExplored = servicesExplored.length === 4;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Demo Progress</CardTitle>
        <CardDescription>
          Explore all 4 services to complete the demo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-semibold">{Math.round(completionRate)}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Time Spent */}
        {timeSpent > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Time Exploring</span>
            </div>
            <Badge variant="secondary">{formatTime(timeSpent)}</Badge>
          </div>
        )}

        {/* Service Navigation */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground mb-3">Services</p>
          {services.map((service) => {
            const Icon = service.icon;
            const isExplored = servicesExplored.includes(service.id);
            const isCurrent = currentService === service.id;

            return (
              <Button
                key={service.id}
                variant={isCurrent ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => onNavigate(service.id)}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="flex-1 text-left">{service.label}</span>
                {isExplored && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </Button>
            );
          })}
        </div>

        {/* Completion Message */}
        {allServicesExplored && (
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm font-semibold text-center mb-2">
              🎉 Demo Complete!
            </p>
            <p className="text-xs text-center text-muted-foreground">
              You've explored all services. Ready to start your journey?
            </p>
          </div>
        )}

        {/* Reset Button */}
        <Button 
          variant="ghost" 
          className="w-full" 
          onClick={onReset}
          size="sm"
        >
          Reset Demo
        </Button>
      </CardContent>
    </Card>
  );
};

export default DemoControlPanel;
