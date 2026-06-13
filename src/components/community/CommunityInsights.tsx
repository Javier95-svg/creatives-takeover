import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Heart, 
  Award,
  Zap,
  Globe,
  Star,
  ArrowUpRight
} from "lucide-react";

const CommunityInsights = () => {
  const insights = [
    {
      label: "Most Active Today",
      value: "Sarah K.",
      description: "Shared 3 success stories",
      icon: Star,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      label: "Trending Topic",
      value: "#AI-startup",
      description: "+120% engagement",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      label: "Success Story",
      value: "$10K MRR",
      description: "Milestone reached!",
      icon: Award,
      color: "text-primary",
      bgColor: "bg-primary/10"
    }
  ];

  const quickStats = [
    { label: "Stories Today", value: "47", change: "+12%" },
    { label: "New Members", value: "23", change: "+8%" },
    { label: "Success Posts", value: "8", change: "+25%" }
  ];

  return (
    <div className="space-y-4">
      {/* Community Pulse */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary animate-pulse" />
            Community Pulse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                <div className={`h-10 w-10 rounded-full ${insight.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${insight.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{insight.label}</div>
                  <div className="font-semibold text-foreground">{insight.value}</div>
                  <div className="text-xs text-muted-foreground">{insight.description}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-secondary" />
            Today's Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {quickStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stat.value}</span>
                  <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success">
                    {stat.change}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Community Goals */}
      <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            This Week's Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Share 100 stories</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-gradient-to-r from-primary to-secondary"></div>
                </div>
                <span className="text-xs text-muted-foreground">75/100</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Welcome 50 new members</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-gradient-to-r from-secondary to-primary"></div>
                </div>
                <span className="text-xs text-muted-foreground">23/50</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Reach 1000 interactions</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-gradient-to-r from-success to-primary"></div>
                </div>
                <span className="text-xs text-muted-foreground">850/1000</span>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full mt-4 border-primary/20 hover:bg-primary/5">
            <Heart className="h-4 w-4 mr-2" />
            Contribute to Goals
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityInsights;