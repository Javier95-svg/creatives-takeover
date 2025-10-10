import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Lightbulb, TrendingUp, Users } from "lucide-react";

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
        'Empathetic AI conversations',
        'Success scoring algorithm',
        'Personalized launch reports',
        'Sprint planning integration'
      ],
      color: 'from-primary/20 to-primary/5'
    },
    {
      id: 'prompts' as const,
      name: 'Prompt Library',
      icon: Lightbulb,
      description: '30+ pre-built prompts for AI, E-commerce, SaaS, and creative businesses',
      features: [
        'Industry-specific templates',
        'One-click BizMap AI integration',
        'Category filtering',
        'Copy & customize prompts'
      ],
      color: 'from-accent/20 to-accent/5'
    },
    {
      id: 'insighta' as const,
      name: 'Insighta',
      icon: TrendingUp,
      description: 'Curated business insights, AI tools, entrepreneurship tips, and funding opportunities',
      features: [
        'AI-powered news aggregation',
        'Personalized recommendations',
        'Reading analytics',
        'Bookmark your favorites'
      ],
      color: 'from-secondary/20 to-secondary/5'
    },
    {
      id: 'community' as const,
      name: 'Community',
      icon: Users,
      description: 'Connect with fellow entrepreneurs, share wins, get feedback, and grow together',
      features: [
        'Reputation & badges system',
        'Daily challenges',
        'Peer feedback',
        'Trending discussions'
      ],
      color: 'from-chart-1/20 to-chart-1/5'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Explore All BizMap AI Services
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Experience our complete platform designed to help entrepreneurs succeed. 
          Click on any service below to try an interactive demo.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Card 
              key={service.id} 
              className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50"
            >
              <CardHeader>
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{service.name}</CardTitle>
                <CardDescription className="text-base">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-muted-foreground">Key Features:</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  onClick={() => onSelectService(service.id)}
                  className="w-full group-hover:scale-105 transition-transform"
                  size="lg"
                >
                  Try {service.name} Demo
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ServiceSelector;
