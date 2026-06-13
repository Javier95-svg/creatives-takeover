import { Card } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Clock, BarChart3, Zap } from "lucide-react";

const metrics = [
  {
    icon: DollarSign,
    label: "Revenue Generated",
    value: "$2.3M",
    change: "+127%",
    color: "text-success"
  },
  {
    icon: Users,
    label: "Active AI Agents",
    value: "1,247",
    change: "+89%",
    color: "text-info"
  },
  {
    icon: Clock,
    label: "Hours Saved",
    value: "45,890",
    change: "+234%",
    color: "text-purple-400"
  },
  {
    icon: BarChart3,
    label: "Conversion Rate",
    value: "34.2%",
    change: "+156%",
    color: "text-warning"
  }
];

const recentAchievements = [
  {
    client: "TechStart Co.",
    result: "300% increase in lead qualification speed",
    timeframe: "3 months",
    avatar: "🚀"
  },
  {
    client: "Creative Studio",
    result: "Automated 80% of content production",
    timeframe: "2 months", 
    avatar: "🎨"
  },
  {
    client: "E-com Brand",
    result: "$500K additional revenue from AI personalization",
    timeframe: "6 months",
    avatar: "🛍️"
  }
];

const ResultsDashboard = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Live Results</span> Dashboard
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Real metrics from businesses transforming with AI. These numbers update in real-time.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {metrics.map((metric, index) => (
            <Card 
              key={metric.label}
              className="glass-card hover-lift relative overflow-hidden group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Animated Border */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <metric.icon className={`w-8 h-8 ${metric.color}`} />
                  <div className={`text-sm font-medium ${metric.color} flex items-center gap-1`}>
                    <TrendingUp className="w-4 h-4" />
                    {metric.change}
                  </div>
                </div>
                
                <div className="text-3xl font-bold mb-2 gradient-text">
                  {metric.value}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {metric.label}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Achievements */}
        <div className="glass-card max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-bold">Recent Client Transformations</h3>
          </div>
          
          <div className="space-y-6">
            {recentAchievements.map((achievement, index) => (
              <div 
                key={achievement.client}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors"
                style={{ animationDelay: `${0.8 + index * 0.2}s` }}
              >
                <div className="text-3xl">{achievement.avatar}</div>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{achievement.client}</div>
                  <div className="text-muted-foreground">{achievement.result}</div>
                </div>
                <div className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
                  {achievement.timeframe}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Indicator */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 glass-card text-sm">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span>Live data • Updates every 30 seconds</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResultsDashboard;