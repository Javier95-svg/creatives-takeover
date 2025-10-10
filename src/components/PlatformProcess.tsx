import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Brain, 
  Users, 
  BarChart3, 
  Rocket,
  ArrowRight,
  CheckCircle 
} from "lucide-react";

const PlatformProcess = () => {
  const steps = [
    {
      number: "01",
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: "AI-Powered Planning",
      description: "Start with our BizMap AI chatbot to analyze your business idea and create a comprehensive strategy.",
      features: ["Business idea validation", "Market analysis", "Strategic recommendations"],
      link: "/dream2plan"
    },
    {
      number: "02", 
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Community Collaboration",
      description: "Connect with fellow entrepreneurs, share insights, and collaborate on projects in real-time.",
      features: ["Entrepreneur network", "Real-time collaboration", "Knowledge sharing"],
      link: "/community"
    },
    {
      number: "03",
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Track & Optimize",
      description: "Monitor your progress with analytics, market intelligence, and success scoring tools.",
      features: ["Performance tracking", "Market insights", "Success analytics"],
      link: "/services"
    },
    {
      number: "04",
      icon: <Rocket className="w-8 h-8 text-primary" />,
      title: "Scale & Launch",
      description: "Execute your plan with sprint management tools and launch your business with confidence.",
      features: ["Sprint planning", "Kanban boards", "Launch support"],
      link: "/pricing"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-background relative overflow-hidden" id="how-it-works">
      {/* Animated Background Elements */}
      <div className="absolute top-20 left-1/4 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-spiral" />
      <div className="absolute bottom-20 right-1/4 w-32 h-32 bg-secondary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/6 w-20 h-20 bg-accent/5 rounded-full blur-xl animate-zigzag" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Our Process
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            From Idea to Success in 4 Steps
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our proven methodology helps entrepreneurs build successful businesses faster 
            with AI-powered insights and collaborative tools.
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
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                {step.number}
              </div>
              
              <CardContent className="p-0">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                  </div>
                </div>
                
                {/* Features List */}
                <ul className="space-y-2 mb-6">
                  {step.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* CTA Button */}
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" asChild>
                  <Link to={step.link}>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center animate-fade-in">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12">
            <h3 className="text-3xl font-bold mb-4 gradient-text">
              Ready to Start Your Journey?
            </h3>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of entrepreneurs who have transformed their ideas into successful businesses.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">10x</div>
                <div className="text-muted-foreground">Faster planning</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <div className="text-muted-foreground">AI support</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">500+</div>
                <div className="text-muted-foreground">Success stories</div>
              </div>
            </div>

            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/dream2plan">
                Start Planning Your Business
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformProcess;