import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  PlayCircle,
  MessageSquare,
  BarChart3,
  Calendar,
  TrendingUp,
  Users
} from "lucide-react";

interface DemoControlPanelProps {
  currentFeature: string;
  featuresExplored: string[];
  onNavigate: (feature: string) => void;
  onReset: () => void;
  timeSpent?: number;
  scenarioName?: string;
}

const features = [
  { id: 'overview', label: 'Overview', icon: PlayCircle },
  { id: 'chatbot', label: 'AI Chatbot', icon: MessageSquare },
  { id: 'business-plan', label: 'Business Planning', icon: BarChart3 },
  { id: 'sprint', label: 'Sprint Planning', icon: Calendar },
  { id: 'market', label: 'Market Intel', icon: TrendingUp },
  { id: 'community', label: 'Community', icon: Users }
];

const DemoControlPanel = ({
  currentFeature,
  featuresExplored,
  onNavigate,
  onReset,
  timeSpent = 0,
  scenarioName
}: DemoControlPanelProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completionRate = (featuresExplored.length / features.length) * 100;

  return (
    <Card className="glass-card sticky top-4">
      <div className="p-6 space-y-6">
        {/* Demo Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              DEMO MODE
            </Badge>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          {scenarioName && (
            <p className="text-sm font-medium">{scenarioName}</p>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{Math.round(completionRate)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Time Spent */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Time spent: {formatTime(timeSpent)}</span>
        </div>

        {/* Feature Navigation */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Demo Sections</p>
          <div className="space-y-1">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isExplored = featuresExplored.includes(feature.id);
              const isCurrent = currentFeature === feature.id;

              return (
                <Button
                  key={feature.id}
                  variant={isCurrent ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => onNavigate(feature.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {feature.label}
                  {isExplored && !isCurrent && (
                    <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Completion Message */}
        {completionRate === 100 && (
          <div className="p-4 bg-primary/10 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-primary">
              🎉 Demo Complete!
            </p>
            <p className="text-xs text-muted-foreground">
              Ready to start your own journey? Sign up to access all features.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default DemoControlPanel;
