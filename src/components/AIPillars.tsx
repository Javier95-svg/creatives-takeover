import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Zap, TrendingUp, ArrowRight, Cpu, Lightbulb, Target } from "lucide-react";

const pillars = [
  {
    icon: Bot,
    title: "Automation",
    subtitle: "Set It & Forget It",
    description: "Deploy AI agents that handle customer service, lead qualification, content creation, and routine tasks while you sleep.",
    features: ["24/7 Customer Support Bots", "Automated Lead Nurturing", "Content Generation Pipeline", "Task Workflow Automation"],
    color: "text-primary",
    borderColor: "border-primary/20",
    bgGradient: "from-primary/10 to-primary/5"
  },
  {
    icon: Lightbulb,
    title: "Augmentation",
    subtitle: "Amplify Your Genius",
    description: "Enhance your creative process with AI that understands your vision and multiplies your output without losing your unique voice.",
    features: ["Creative AI Assistants", "Strategy Optimization", "Market Research Automation", "Personalized Customer Insights"],
    color: "text-secondary",
    borderColor: "border-secondary/20",
    bgGradient: "from-secondary/10 to-secondary/5"
  },
  {
    icon: Target,
    title: "Agency",
    subtitle: "Scale Without Limits",
    description: "Build intelligent systems that learn, adapt, and make decisions. Your business runs itself while you focus on vision and growth.",
    features: ["Predictive Analytics", "Autonomous Decision Making", "Self-Optimizing Campaigns", "Intelligent Resource Allocation"],
    color: "text-accent",
    borderColor: "border-accent/20",
    bgGradient: "from-accent/10 to-accent/5"
  }
];

const AIPillars = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            The <span className="gradient-text">Three Pillars</span> of AI Business
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Master automation, augmentation, and agency to build a business that works for you, not the other way around.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {pillars.map((pillar, index) => (
            <Card 
              key={pillar.title}
              className={`glass-card hover-lift relative overflow-hidden border ${pillar.borderColor} group cursor-pointer`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${pillar.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6 ${pillar.color} group-hover:scale-110 transition-transform duration-300`}>
                  <pillar.icon className="w-8 h-8" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-2">{pillar.title}</h3>
                <p className={`text-sm font-medium mb-4 ${pillar.color}`}>{pillar.subtitle}</p>

                {/* Description */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {pillar.description}
                </p>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {pillar.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <Zap className={`w-4 h-4 ${pillar.color}`} />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button 
                  variant="outline" 
                  className={`w-full glass border-border hover:bg-accent/10 group-hover:border-${pillar.color.split('-')[1]}/50 transition-colors`}
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <Button size="lg" className="glass bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-8 py-4 text-lg hover-lift">
            Master All Three Pillars
            <TrendingUp className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default AIPillars;