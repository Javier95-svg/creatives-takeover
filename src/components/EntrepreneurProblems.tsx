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
      icon: <Clock className="w-8 h-8 text-red-500" />,
      problem: "Endless Planning, No Revenue",
      description: "Six months of 'perfect planning' while competitors are already making money. You're stuck in research mode.",
      solution: "30-day sprint roadmap forces you to ship fast and validate with real customers, not hypothetical plans."
    },
    {
      icon: <Brain className="w-8 h-8 text-red-500" />,
      problem: "Generic MBA Advice",
      description: "Business consultants who've never launched a creative business telling you to 'write a 50-page business plan.'",
      solution: "AI trained specifically on creative business models - understands your vision without corporate jargon."
    },
    {
      icon: <TrendingDown className="w-8 h-8 text-red-500" />,
      problem: "Launching in the Dark",
      description: "No idea if anyone will actually pay for your idea. You're guessing instead of validating with real data.",
      solution: "Real-time market intelligence shows what creative businesses are working RIGHT NOW in your niche."
    },
    {
      icon: <Users className="w-8 h-8 text-red-500" />,
      problem: "Zero Accountability",
      description: "Starting strong on Monday, ghosting your project by Friday. No one to keep you on track or celebrate wins with.",
      solution: "Accountability partners, daily check-ins, and monthly demo days keep you shipping and celebrating progress."
    },
    {
      icon: <Target className="w-8 h-8 text-red-500" />,
      problem: "Fear of Being 'Too Creative'",
      description: "Everyone says 'be practical' and 'play it safe.' You water down your bold ideas trying to fit corporate molds.",
      solution: "Built FOR creatives BY creatives. We celebrate bold ideas and help you monetize your unique vision."
    },
    {
      icon: <Zap className="w-8 h-8 text-red-500" />,
      problem: "No Clear First Steps",
      description: "Overwhelmed by all the things you 'should' do. Where do you even start? What matters most?",
      solution: "Day-by-day roadmap tells you exactly what to do today to get to your first paying customer."
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
            Don't Repeat the Same Mistakes.
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            Why Most Small Businesses <span className="text-red-500">Never Scale</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Generic business advice doesn't work for creatives. You need a system built specifically for how you think and create.
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
      </div>
    </section>
  );
};

export default EntrepreneurProblems;