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
      title: "Share Your Creative Vision",
      description: "Tell our AI about your creative idea, passion project, or business concept.",
      details: ["Describe your vision", "Upload inspiration", "Set your goals"],
      time: "2 minutes"
    },
    {
      number: "02",
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: "AI Analyzes & Strategizes",
      description: "Our AI instantly analyzes market potential and creates a custom business strategy.",
      details: ["Market analysis", "Competitor research", "Revenue modeling"],
      time: "30 seconds"
    },
    {
      number: "03",
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      title: "Get Your Action Plan",
      description: "Receive a detailed roadmap with specific steps to turn your idea into reality.",
      details: ["Step-by-step roadmap", "Resource recommendations", "Timeline planning"],
      time: "Instant"
    },
    {
      number: "04",
      icon: <Rocket className="w-8 h-8 text-primary" />,
      title: "Launch & Scale",
      description: "Execute your plan with our community support and automated tools.",
      details: ["Community feedback", "Progress tracking", "Growth optimization"],
      time: "Ongoing"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-muted/20 via-background to-muted/10 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-spiral" />
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-secondary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Simple 4-Step Process
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            From Idea to Business in Minutes
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our proven process has helped thousands of creative entrepreneurs transform 
            their ideas into profitable businesses. Here's exactly how it works.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="relative glass border-border hover:shadow-xl transition-all duration-500 hover-lift group p-8" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                {step.number}
              </div>
              
              {/* Time Badge */}
              <div className="absolute -top-3 right-6">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Clock className="w-3 h-3 mr-1" />
                  {step.time}
                </Badge>
              </div>
              
              <CardContent className="p-0">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                  </div>
                </div>
                
                {/* Details List */}
                <ul className="space-y-2">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interactive CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 animate-fade-in">
            <h3 className="text-3xl font-bold mb-4 gradient-text">
              Ready to See It in Action?
            </h3>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Don't just take our word for it. Try our process with your own creative idea right now.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">2 min</div>
                <div className="text-sm text-muted-foreground">Average setup time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">30 sec</div>
                <div className="text-sm text-muted-foreground">AI analysis speed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Free to try</div>
              </div>
            </div>

            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
              <Link to="/dream2plan">
                Try It With My Idea
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;