import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Brain,
  Clock,
  Target,
  TrendingDown,
  Users,
  Zap,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const EntrepreneurProblems = () => {
  const problems = [
    {
      icon: <Brain className="w-8 h-8 text-red-500" />,
      problem: "Idea Validation Paralysis",
      description: "Spending months researching without knowing if your business idea will actually work.",
      solution: "AI-powered business analysis that validates your idea in minutes, not months."
    },
    {
      icon: <Clock className="w-8 h-8 text-red-500" />,
      problem: "Time-Consuming Planning",
      description: "Creating comprehensive business plans takes weeks of research and writing.",
      solution: "BizMap AI generates detailed business strategies and action plans instantly."
    },
    {
      icon: <Users className="w-8 h-8 text-red-500" />,
      problem: "Working in Isolation", 
      description: "Building a business alone without feedback, support, or collaboration.",
      solution: "Connect with a community of entrepreneurs and collaborate in real-time."
    },
    {
      icon: <TrendingDown className="w-8 h-8 text-red-500" />,
      problem: "Missing Market Opportunities",
      description: "Lack of market intelligence leads to missed trends and opportunities.",
      solution: "Real-time market insights and trend analysis keep you ahead of the curve."
    },
    {
      icon: <Target className="w-8 h-8 text-red-500" />,
      problem: "Poor Project Management",
      description: "Struggling to organize tasks, track progress, and meet deadlines effectively.",
      solution: "Advanced sprint planning and Kanban tools designed for entrepreneurs."
    },
    {
      icon: <Zap className="w-8 h-8 text-red-500" />,
      problem: "Analysis Without Action",
      description: "Getting stuck in planning mode without clear next steps or execution strategy.",
      solution: "AI-generated action plans with clear milestones and success tracking."
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-red-500/5 rounded-full blur-3xl animate-spiral" />
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-primary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/6 w-20 h-20 bg-accent/5 rounded-full blur-xl animate-zigzag" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 mb-6">
            Common Entrepreneur Challenges
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Stop Struggling with <span className="text-red-500">These Problems</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every entrepreneur faces these challenges. The difference is having the right tools 
            and community to overcome them quickly.
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {problems.map((item, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-red-600">{item.problem}</h3>
                    <p className="text-muted-foreground mb-4">{item.description}</p>
                  </div>
                </div>
                
                {/* Solution */}
                <div className="border-t border-border/50 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary mb-2">Our Solution:</h4>
                      <p className="text-sm text-muted-foreground">{item.solution}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Solution CTA */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 text-center animate-fade-in">
          <h3 className="text-3xl font-bold mb-4 gradient-text">
            Ready to Solve These Problems?
          </h3>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our AI-powered platform addresses every one of these challenges, 
            helping you build a successful business faster and smarter.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Instant Business Analysis</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Community Support</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Market Intelligence</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/dream2plan">
                Get Your Business Plan Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/services">
                Explore All Features
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;