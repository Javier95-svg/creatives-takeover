import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Brain, 
  Lightbulb, 
  Rocket, 
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle
} from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: <Lightbulb className="w-8 h-8 text-primary" />,
      title: "Brain Dump Your Idea (Day 1-3)",
      description: "Talk to your AI co-founder like a real business partner. No jargon, no 50-page plans - just honest conversation about your creative vision.",
      details: ["Conversational AI planning", "No business jargon required", "Your creative language"],
      time: "15 min"
    },
    {
      number: "02",
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: "Get Your Launch Roadmap (Day 4-7)",
      description: "AI analyzes creative business models (not corporate playbooks) to build your custom 30-day roadmap with daily milestones.",
      details: ["Creative-first analysis", "Daily action items", "Revenue-focused milestones"],
      time: "Instant"
    },
    {
      number: "03",
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      title: "Sprint to First Dollar (Day 8-28)",
      description: "Daily check-ins, accountability partner support, and real-time market intelligence keep you moving. No ghosting allowed.",
      details: ["Daily accountability", "Partner matching", "Live market data"],
      time: "21 days"
    },
    {
      number: "04",
      icon: <Rocket className="w-8 h-8 text-primary" />,
      title: "Celebrate & Scale (Day 29-30+)",
      description: "Make your first dollar, join Demo Day to showcase your launch, then scale with the community cheering you on.",
      details: ["First dollar celebration", "Monthly demo days", "Revenue scaling support"],
      time: "Ongoing"
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Process-Focused Blueprint Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-indigo-900/10 to-cyan-950/15" />
      
      {/* Blueprint Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px'
        }} />
      </div>
      
      {/* Process Flow Lines */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Horizontal flow lines */}
        <div className="absolute top-1/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-3/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Vertical connection lines */}
        <div className="absolute top-0 left-1/4 w-0.5 h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-0 left-2/4 w-0.5 h-full bg-gradient-to-b from-transparent via-blue-400/20 to-transparent" />
        <div className="absolute top-0 left-3/4 w-0.5 h-full bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent" />
      </div>
      
      {/* Gear/Cog Elements */}
      <div className="absolute top-20 right-20 w-16 h-16 border-2 border-primary/20 rounded-full animate-spin" style={{ animationDuration: '10s' }}>
        <div className="absolute inset-2 border-2 border-primary/30 rounded-full" />
      </div>
      <div className="absolute bottom-20 left-20 w-12 h-12 border-2 border-blue-400/20 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
        <div className="absolute inset-2 border-2 border-blue-400/30 rounded-full" />
      </div>
      
      {/* Step Indicators */}
      <div className="absolute top-32 left-1/4 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-bold animate-pulse">1</div>
      <div className="absolute top-48 left-2/4 w-8 h-8 bg-blue-400/10 rounded-full flex items-center justify-center text-blue-400 text-sm font-bold animate-pulse" style={{ animationDelay: '0.5s' }}>2</div>
      <div className="absolute top-32 left-3/4 w-8 h-8 bg-cyan-400/10 rounded-full flex items-center justify-center text-cyan-400 text-sm font-bold animate-pulse" style={{ animationDelay: '1s' }}>3</div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            Your 30-Day Launch System
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 gradient-text px-4">
            From Scattered Idea to First Dollar
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            The exact framework 15,000+ creatives used to go from idea to first paying customer
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 px-4">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="relative glass border-border hover:shadow-xl transition-all duration-500 hover-lift group p-4 sm:p-6 lg:p-8" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              {/* Step Number */}
              <div className="absolute -top-3 sm:-top-4 -left-3 sm:-left-4 w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-bold text-base sm:text-lg shadow-lg">
                {step.number}
              </div>
              
              {/* Time Badge */}
              <div className="absolute -top-2 sm:-top-3 right-4 sm:right-6">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {step.time}
                </Badge>
              </div>
              
              <CardContent className="p-0">
                <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="p-2 sm:p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 text-primary">
                      {step.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">{step.description}</p>
                  </div>
                </div>
                
                {/* Details List */}
                <ul className="space-y-2">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-center text-xs sm:text-sm">
                      <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4 text-primary mr-2 sm:mr-3 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interactive CTA */}
        <div className="text-center px-4">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-6 sm:p-8 lg:p-12 animate-fade-in">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4 gradient-text">
              Ready to See It in Action?
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Don't just take our word for it. Try our process with your own creative idea right now.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary mb-2">2 min</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Average setup time</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary mb-2">30 sec</div>
                <div className="text-xs sm:text-sm text-muted-foreground">AI analysis speed</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary mb-2">100%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Free to try</div>
              </div>
            </div>

            <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-6 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto" asChild>
              <Link to="/dream2plan">
                Try It With My Idea
                <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;