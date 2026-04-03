import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  CheckCircle, 
  Calendar,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  Lock,
  ListTodo,
  Flag,
  BookOpen,
  Zap,
  FolderKanban,
  Clock,
  CheckSquare
} from "lucide-react";

const DashboardPreview = () => {
  return (
    <div className="min-h-screen relative overflow-hidden py-12 px-4 bg-background">
      {/* Subtle grid pattern for light theme */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px'
        }} />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Dashboard Preview Badge - Moved Above Title */}
        <div className="text-center mb-6 animate-fade-in">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Lock className="w-3 h-3 mr-1" />
            Dashboard Preview
          </Badge>
        </div>

        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-headline-lg sm:text-headline-xl font-bold mb-4 text-foreground">
            Your Founder Command Center
          </h1>
          <p className="text-body sm:text-body-lg text-muted-foreground max-w-2xl mx-auto">
            Your strategic planning hub to organize, prioritize, and track projects designed for founders who demand clarity and control.
          </p>
        </div>

        {/* Project Planning Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Task Overview */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ListTodo className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-lg">Task Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    { task: "Complete market research", priority: "High", status: "in-progress" },
                    { task: "Draft MVP specifications", priority: "High", status: "pending" },
                    { task: "Schedule team meeting", priority: "Medium", status: "pending" },
                    { task: "Review competitor analysis", priority: "Low", status: "completed" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="mt-0.5">
                        {item.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-[hsl(var(--green-primary))]" />
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.task}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              item.priority === 'High' ? 'border-[hsl(var(--red-primary))]/50 text-[hsl(var(--red-primary))]' :
                              item.priority === 'Medium' ? 'border-[hsl(var(--blue-primary))]/50 text-[hsl(var(--blue-primary))]' :
                              'border-[hsl(var(--green-primary))]/50 text-[hsl(var(--green-primary))]'
                            }`}
                          >
                            {item.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>4 tasks total</span>
                    <span className="text-[hsl(var(--green-primary))] font-semibold">1 completed</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestones Tracker */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-accent" />
                </div>
                <CardTitle className="text-lg">Key Milestones</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { milestone: "Project Kickoff", date: "Jan 15", status: "completed", progress: 100 },
                  { milestone: "MVP Prototype", date: "Feb 28", status: "active", progress: 65 },
                  { milestone: "Beta Testing", date: "Mar 15", status: "upcoming", progress: 0 },
                  { milestone: "Public Launch", date: "Apr 1", status: "upcoming", progress: 0 }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          item.status === 'completed' ? 'bg-[hsl(var(--green-primary))]/20 text-[hsl(var(--green-primary))]' :
                          item.status === 'active' ? 'bg-[hsl(var(--blue-primary))]/20 text-[hsl(var(--blue-primary))]' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {item.status === 'completed' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{item.milestone}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                    {item.status === 'active' && (
                      <div className="ml-8 space-y-1">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">{item.progress}% complete</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resource Shortcuts */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-secondary" />
                </div>
                <CardTitle className="text-lg">Quick Resources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Project Templates", icon: FolderKanban, color: "text-[hsl(var(--blue-primary))]" },
                  { name: "Planning Guides", icon: BookOpen, color: "text-[hsl(var(--red-primary))]" },
                  { name: "Time Tracker", icon: Clock, color: "text-[hsl(var(--blue-primary))]" },
                  { name: "Task Manager", icon: CheckSquare, color: "text-[hsl(var(--green-primary))]" }
                ].map((resource, idx) => (
                  // FIX(dead-click): /dashboard — static preview resource cards no longer advertise clickability with pointer and hover CTA affordances.
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg ${
                      resource.name === 'Project Templates' ? 'bg-[hsl(var(--blue-primary))]/10' :
                      resource.name === 'Planning Guides' ? 'bg-[hsl(var(--red-primary))]/10' :
                      resource.name === 'Time Tracker' ? 'bg-[hsl(var(--blue-primary))]/10' :
                      'bg-[hsl(var(--green-primary))]/10'
                    } flex items-center justify-center`}>
                      <resource.icon className={`w-5 h-5 ${resource.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{resource.name}</div>
                      <div className="text-xs text-muted-foreground">Quick access</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customizable Project Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Active Projects */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Active Projects</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">3 Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "SaaS Platform Launch", status: "In Progress", progress: 72, tasks: "12/18 tasks" },
                  { name: "Marketing Campaign", status: "Planning", progress: 35, tasks: "5/14 tasks" },
                  { name: "Product Roadmap Q1", status: "Review", progress: 90, tasks: "18/20 tasks" }
                ].map((project, idx) => (
                  <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold mb-1">{project.name}</div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{project.status}</Badge>
                          <span className="text-xs text-muted-foreground">{project.tasks}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-semibold">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Project Planning Tools */}
          <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-accent" />
                </div>
                <CardTitle className="text-lg">Planning Tools</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* FIX(dead-click): /dashboard — static planning-tool tiles were stripped of pointer styling so they read as preview content instead of inert controls. */}
                  <div className="p-4 bg-muted/30 rounded-lg text-center border border-border/50 transition-colors">
                    <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                    <div className="text-sm font-semibold mb-1">Timeline View</div>
                    <div className="text-xs text-muted-foreground">Visual roadmap</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center border border-border/50 transition-colors">
                    <ListTodo className="w-6 h-6 text-secondary mx-auto mb-2" />
                    <div className="text-sm font-semibold mb-1">Task Board</div>
                    <div className="text-xs text-muted-foreground">Kanban style</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center border border-border/50 transition-colors">
                    <Flag className="w-6 h-6 text-accent mx-auto mb-2" />
                    <div className="text-sm font-semibold mb-1">Milestones</div>
                    <div className="text-xs text-muted-foreground">Track goals</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center border border-border/50 transition-colors">
                    <TrendingUp className="w-6 h-6 text-[hsl(var(--green-primary))] mx-auto mb-2" />
                    <div className="text-sm font-semibold mb-1">Analytics</div>
                    <div className="text-xs text-muted-foreground">Progress insights</div>
                  </div>
                </div>
                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Customize your dashboard layout and add project sections that matter to you
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <Card className="border-primary/20 bg-card p-8">
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold">Ready to Access Your Command Center?</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Join 1,200+ founders using our strategic planning hub to organize projects, track milestones, and execute with precision.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    Sign Up to Access Your Command Center
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
                  <span>1,200+ Active Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[hsl(var(--green-primary))]" />
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

