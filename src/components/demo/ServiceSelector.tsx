import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Lightbulb, TrendingUp, Users, ArrowRight } from "lucide-react";

interface ServiceSelectorProps {
  onSelectService: (service: 'bizmap' | 'prompts' | 'insighta' | 'community') => void;
}

const ServiceSelector = ({ onSelectService }: ServiceSelectorProps) => {
  const services = [
    {
      id: 'bizmap' as const,
      name: 'BizMap AI',
      icon: Bot,
      description: 'Your AI co-founder that guides you through a 7-step business planning wizard',
      features: [
        '7-step interactive business wizard',
        'Real-time AI guidance & validation',
        'Success probability scoring',
        'Downloadable business roadmap'
      ],
      color: 'from-primary/20 to-primary/5'
    },
    {
      id: 'prompts' as const,
      name: 'Prompt Library',
      icon: Lightbulb,
      description: '30+ battle-tested prompts for AI, E-commerce, SaaS, and creative businesses',
      features: [
        '4 industry categories to explore',
        'Copy prompts with one click',
        'Direct BizMap AI integration',
        'Customizable for your business'
      ],
      color: 'from-accent/20 to-accent/5'
    },
    {
      id: 'insighta' as const,
      name: 'Insighta',
      icon: TrendingUp,
      description: 'Stay ahead with curated articles on AI tools, growth strategies, and startup trends',
      features: [
        'Daily trending business articles',
        'AI tools & productivity hacks',
        'Growth & marketing strategies',
        'Bookmark & track your reading'
      ],
      color: 'from-secondary/20 to-secondary/5'
    },
    {
      id: 'community' as const,
      name: 'Community',
      icon: Users,
      description: 'Join 10,000+ entrepreneurs sharing progress, getting feedback, and growing together',
      features: [
        'Share wins & get support',
        'Daily challenges & rewards',
        'Reputation badges & leveling',
        'Connect with like-minded founders'
      ],
      color: 'from-chart-1/20 to-chart-1/5'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Choose Your <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Starting Point</span>
        </h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Each service plays a crucial role in your entrepreneurial journey. 
          Start anywhere and explore them all to see the complete picture.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <Card 
              key={service.id} 
              className="group relative overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 border-2 hover:border-primary/50 animate-fade-in hover-scale cursor-pointer"
              style={{ animationDelay: `${index * 150}ms` }}
              onClick={() => onSelectService(service.id)}
            >
              {/* Gradient Background Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              {/* Animated Corner Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="relative z-10">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-10 h-10 text-primary group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-3xl mb-3 group-hover:text-primary transition-colors">
                  {service.name}
                </CardTitle>
                <CardDescription className="text-lg leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative z-10">
                <div className="space-y-4 mb-8">
                  <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  <p className="text-sm font-bold text-primary uppercase tracking-wider">What You&apos;ll Experience:</p>
                  <ul className="space-y-3">
                    {service.features.map((feature, featureIndex) => (
                      <li 
                        key={featureIndex} 
                        className="flex items-start gap-3 text-base group-hover:translate-x-1 transition-transform duration-300"
                        style={{ transitionDelay: `${featureIndex * 50}ms` }}
                      >
                        <span className="text-primary mt-1 text-xl font-bold">✓</span>
                        <span className="group-hover:text-foreground transition-colors">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button 
                  onClick={() => onSelectService(service.id)}
                  className="w-full group-hover:scale-105 group-hover:shadow-xl transition-all duration-300 text-lg py-6 bg-gradient-to-r from-primary to-accent"
                  size="lg"
                >
                  <span className="flex items-center gap-2">
                    Explore {service.name}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </CardContent>
              
              {/* Hover Border Glow */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 blur-xl" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Journey Visualization */}
      <div className="mt-20 text-center animate-fade-in">
        <div className="inline-flex items-center gap-4 px-8 py-4 rounded-full bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium">Plan</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm font-medium">Inspire</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-secondary" />
            </div>
            <span className="text-sm font-medium">Learn</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-chart-1/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-chart-1" />
            </div>
            <span className="text-sm font-medium">Connect</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Your complete entrepreneurial journey, all in one platform
        </p>
      </div>
    </div>
  );
};

export default ServiceSelector;
