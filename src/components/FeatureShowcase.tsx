import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Target, Users, Rocket } from "lucide-react";

const FeatureShowcase = () => {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: "Lightning Fast Development",
      description: "Build production-ready apps 10x faster with our AI-powered platform. From idea to deployment in minutes, not months.",
      stats: "90% faster time-to-market",
      gradient: "from-primary/10 to-info/10"
    },
    {
      icon: <Target className="w-8 h-8 text-success" />,
      title: "Precision AI Matching",
      description: "Our advanced AI understands your vision and matches you with the perfect technical solutions and design patterns.",
      stats: "99.2% accuracy rate",
      gradient: "from-success/10 to-success/10"
    },
    {
      icon: <Users className="w-8 h-8 text-purple-500" />,
      title: "Collaborative Ecosystem",
      description: "Connect with a thriving community of creators, developers, and innovators who share your passion for building.",
      stats: "50k+ active creators",
      gradient: "from-purple-500/10 to-pink-500/10"
    },
    {
      icon: <Rocket className="w-8 h-8 text-warning" />,
      title: "Scale Without Limits",
      description: "Your apps grow with your success. Enterprise-grade infrastructure that scales from prototype to millions of users.",
      stats: "99.99% uptime guarantee",
      gradient: "from-warning/10 to-destructive/10"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-slide-up">
            Revolutionary Features for
            <span className="text-primary"> Modern Creators</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Experience the next generation of app development with tools designed 
            for the future of creativity and innovation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className={`p-8 hover:shadow-xl hover:scale-105 transition-all duration-500 border-border/50 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm animate-fade-in hover:animate-glow`}
              style={{ animationDelay: `${index * 0.3}s` }}
            >
              <div className="flex items-start gap-4 mb-6">
                {feature.icon}
                <div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{feature.stats}</span>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:scale-110 transition-all duration-300">
                  Learn More <ArrowRight className="w-4 h-4 ml-1 animate-pulse" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center animate-slide-up" style={{ animationDelay: '1.2s' }}>
          <Button size="lg" className="bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 animate-glow">
            Start Building Today
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;