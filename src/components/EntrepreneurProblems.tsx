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
      problem: "Creative Idea Overwhelm",
      description: "You have amazing creative concepts but struggle to turn them into viable business models.",
      solution: "AI-powered business planning that transforms creative ideas into structured, profitable strategies."
    },
    {
      icon: <Clock className="w-8 h-8 text-red-500" />,
      problem: "Manual Business Planning",
      description: "Spending weeks on research and planning when you could be creating and building instead.",
      solution: "Automated business planning tools that handle the heavy lifting so you can focus on innovation."
    },
    {
      icon: <Users className="w-8 h-8 text-red-500" />,
      problem: "Creative Isolation", 
      description: "Working alone without feedback from other creative entrepreneurs who understand your vision.",
      solution: "Join a community of 15,000+ creative entrepreneurs, innovators, and startup founders."
    },
    {
      icon: <TrendingDown className="w-8 h-8 text-red-500" />,
      problem: "Missing Market Opportunities",
      description: "Great ideas but lack of market intelligence to know what creative solutions are in demand.",
      solution: "AI-driven market insights show you exactly where creative opportunities are emerging."
    },
    {
      icon: <Target className="w-8 h-8 text-red-500" />,
      problem: "Complex Tool Integration",
      description: "Juggling multiple business tools instead of having one integrated no-code solution.",
      solution: "All-in-one platform with no-code automation that replaces 10+ separate business tools."
    },
    {
      icon: <Zap className="w-8 h-8 text-red-500" />,
      problem: "Slow Execution Speed",
      description: "Creative projects taking months to execute when competitors are shipping in weeks.",
      solution: "AI-powered automation and templates designed for rapid creative business execution."
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Problem-Focused Dark Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 via-gray-900/20 to-orange-950/20" />
      
      {/* Circuit Board Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(239, 68, 68, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Scattered Problem Icons Background */}
      <div className="absolute inset-0 opacity-5">
        {/* Scattered X marks representing problems */}
        <div className="absolute top-20 left-20 text-red-500 text-4xl font-bold">✕</div>
        <div className="absolute top-40 right-32 text-red-500 text-3xl font-bold">✕</div>
        <div className="absolute bottom-32 left-40 text-red-500 text-5xl font-bold">✕</div>
        <div className="absolute bottom-48 right-20 text-red-500 text-2xl font-bold">✕</div>
        <div className="absolute top-1/2 left-1/3 text-red-500 text-6xl font-bold">✕</div>
        <div className="absolute top-1/3 right-1/4 text-red-500 text-3xl font-bold">✕</div>
      </div>
      
      {/* Warning Stripes */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      
      {/* Glitch Effect Elements */}
      <div className="absolute top-1/4 left-1/5 w-32 h-1 bg-red-500/30 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/5 w-24 h-1 bg-orange-500/30 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            Creative Entrepreneur Challenges
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            Stop Struggling with <span className="text-red-500">These Problems</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Every creative entrepreneur faces these challenges. The difference? Having AI-powered tools 
            and automation to solve them <strong className="text-foreground">instantly</strong>.
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 px-4">
          {problems.map((item, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 text-red-500">
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold mb-2 text-red-600">{item.problem}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">{item.description}</p>
                  </div>
                </div>
                
                {/* Solution */}
                <div className="border-t border-border/50 pt-4 sm:pt-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-primary mb-2 text-sm sm:text-base">Our Solution:</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{item.solution}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Solution CTA */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-6 sm:p-8 lg:p-12 text-center animate-fade-in mx-4">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4 gradient-text">
            Ready to Automate Your Success?
          </h3>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Stop struggling with manual processes and complex tools. Get AI-powered business planning 
            that <strong className="text-foreground">actually works for creatives</strong>.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Instant Business Analysis</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Community Support</span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-1">
              <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Market Intelligence</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-6 w-full sm:w-auto" asChild>
              <Link to="/dream2plan">
                Get AI Business Support
                <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-6 w-full sm:w-auto" asChild>
              <Link to="/community">
                Join Creative Community
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;