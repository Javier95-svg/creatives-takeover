import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  CheckCircle, 
  BarChart3, 
  FileText, 
  Users, 
  Calendar,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  Lock
} from "lucide-react";

const DashboardPreview = () => {
  const features = [
    {
      icon: BarChart3,
      title: "BizMap AI Progress Tracking",
      description: "Track your business planning progress with AI-powered insights"
    },
    {
      icon: FileText,
      title: "Saved Business Plans & Ideas",
      description: "Access all your saved business plans and ideas in one place"
    },
    {
      icon: Users,
      title: "Community Engagement Analytics",
      description: "Monitor your community activity and engagement metrics"
    },
    {
      icon: Calendar,
      title: "Project Timeline Management",
      description: "Manage your project milestones and track progress over time"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden py-12 px-4">
      {/* Tech Background Base - matching PersonalizedDashboard */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/30 via-blue-950/20 to-slate-900/40" />
      
      {/* Circuit Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 25px 25px, 25px 25px'
        }} />
      </div>

      {/* Animated Hexagons - Top Right */}
      <div className="absolute top-20 right-20 opacity-20">
        {[...Array(2)].map((_, i) => (
          <div key={`hex-top-${i}`} className="absolute w-32 h-32" style={{ 
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '1px solid',
            borderColor: `hsl(var(--primary) / ${0.4 - i * 0.15})`,
            transform: `scale(${1 + i * 0.3})`,
            animation: `spin ${30 - i * 5}s linear infinite ${i % 2 === 0 ? 'normal' : 'reverse'}`
          }} />
        ))}
      </div>

      {/* Animated Hexagons - Bottom Left */}
      <div className="absolute bottom-20 left-20 opacity-15">
        {[...Array(2)].map((_, i) => (
          <div key={`hex-bottom-${i}`} className="absolute w-24 h-24" style={{ 
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '1px solid',
            borderColor: `hsl(var(--secondary) / ${0.3 - i * 0.1})`,
            transform: `scale(${1 + i * 0.25})`,
            animation: `spin ${25 - i * 4}s linear infinite reverse`
          }} />
        ))}
      </div>

      {/* Scanning Lines Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" 
             style={{ animation: 'slideDown 10s ease-in-out infinite' }} />
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-secondary/20 to-transparent" 
             style={{ animation: 'slideRight 12s ease-in-out infinite', animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Lock className="w-3 h-3 mr-1" />
            Dashboard Preview
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 gradient-text">
            Your Founder Command Center
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to plan, track, and grow your business—all in one place
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title}
                className="glass-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Preview Cards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* BizMap AI Progress Preview */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-lg">BizMap AI Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Business Plan Completion</span>
                    <span className="font-semibold">68%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000 animate-pulse"
                      style={{ width: '68%' }}
                    />
                  </div>
                </div>
                
                {/* Mock Stats */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-lg font-bold text-primary">7</div>
                    <div className="text-xs text-muted-foreground">Steps Done</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-lg font-bold text-green-500">3</div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-lg font-bold text-accent">85%</div>
                    <div className="text-xs text-muted-foreground">Success Score</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Plans Preview */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-secondary" />
                </div>
                <CardTitle className="text-lg">Saved Business Plans</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Mock Plan Cards */}
                {[
                  { name: "AI SaaS Platform", status: "In Progress", progress: 75 },
                  { name: "E-commerce Store", status: "Draft", progress: 30 },
                  { name: "Creative Agency", status: "Completed", progress: 100 }
                ].map((plan, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{plan.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {plan.status}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-secondary to-secondary/80 rounded-full"
                        style={{ width: `${plan.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Community Analytics Preview */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-500" />
                </div>
                <CardTitle className="text-lg">Community Engagement</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary mb-1">24</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-500 mb-1">156</div>
                    <div className="text-xs text-muted-foreground">Engagements</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-accent mb-1">8</div>
                    <div className="text-xs text-muted-foreground">Connections</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-500 mb-1">12</div>
                    <div className="text-xs text-muted-foreground">Streak Days</div>
                  </div>
                </div>
                
                {/* Mock Chart Preview */}
                <div className="h-24 bg-muted/20 rounded-lg flex items-end justify-around p-2 gap-1">
                  {[65, 45, 70, 55, 80, 60, 75].map((height, idx) => (
                    <div 
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-primary to-primary/60 rounded-t transition-all duration-300 hover:opacity-80"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Management Preview */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <CardTitle className="text-lg">Project Timeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Mock Timeline Items */}
                {[
                  { milestone: "Validation Complete", date: "Week 1", status: "done" },
                  { milestone: "MVP Development", date: "Week 2-3", status: "active" },
                  { milestone: "Beta Launch", date: "Week 4", status: "upcoming" },
                  { milestone: "First Customer", date: "Week 5", status: "upcoming" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.status === 'done' ? 'bg-green-500/20 text-green-500' :
                      item.status === 'active' ? 'bg-primary/20 text-primary animate-pulse' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {item.status === 'done' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.milestone}</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                    </div>
                    {item.status === 'active' && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <Card className="glass-card border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-8">
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold">Ready to Access Your Dashboard?</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of founders using our platform to track progress, manage projects, and grow their businesses.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    Sign Up to Access Your Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="w-full sm:w-auto h-12 px-8 border-2 hover:bg-muted/50"
                  >
                    Already have an account? Sign In
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span>15,000+ Active Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>92% Success Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>AI-Powered Insights</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;

