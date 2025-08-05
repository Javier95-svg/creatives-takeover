import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Infinity, 
  Zap, 
  Users, 
  Cloud, 
  Palette, 
  BarChart3,
  ArrowRight,
  Check
} from "lucide-react";

const SubscriptionFeatures = () => {
  const features = [
    {
      icon: <Infinity className="w-10 h-10 text-primary" />,
      title: "Unlimited Design Access",
      description: "Access our entire library of premium templates, assets, and design resources.",
      benefits: ["10,000+ premium templates", "Unlimited downloads", "Commercial license included"],
      highlight: "Most Popular"
    },
    {
      icon: <Zap className="w-10 h-10 text-primary" />,
      title: "AI-Powered Tools",
      description: "Smart automation and AI assistance to accelerate your creative workflow.",
      benefits: ["Smart design suggestions", "Auto background removal", "AI content generation"],
      highlight: "New"
    },
    {
      icon: <Cloud className="w-10 h-10 text-primary" />,
      title: "Cloud Collaboration",
      description: "Work seamlessly with your team from anywhere with real-time sync.",
      benefits: ["Real-time collaboration", "Cloud storage", "Version control"],
      highlight: ""
    },
    {
      icon: <Users className="w-10 h-10 text-primary" />,
      title: "Team Workspaces",
      description: "Dedicated spaces for team projects with advanced permission controls.",
      benefits: ["Shared workspaces", "Role-based access", "Project management"],
      highlight: ""
    },
    {
      icon: <Palette className="w-10 h-10 text-primary" />,
      title: "Creative Asset Library",
      description: "Massive collection of photos, graphics, fonts, and multimedia assets.",
      benefits: ["1M+ stock photos", "Premium fonts", "Vector graphics"],
      highlight: ""
    },
    {
      icon: <BarChart3 className="w-10 h-10 text-primary" />,
      title: "Performance Analytics",
      description: "Track your creative performance and optimize for better results.",
      benefits: ["Usage analytics", "Performance insights", "ROI tracking"],
      highlight: ""
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="features">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Creative Subscription Features
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Everything You Need in One Subscription
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our creative subscription service combines powerful tools, unlimited resources, 
            and intelligent features to supercharge your creative workflow.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="relative glass border-border hover:shadow-xl transition-all duration-500 hover-lift group" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              {feature.highlight && (
                <div className="absolute -top-3 left-6">
                  <Badge className={`${
                    feature.highlight === "Most Popular" ? "bg-primary" : "bg-green-500"
                  } text-white shadow-lg`}>
                    {feature.highlight}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mr-4">
                    {feature.icon}
                  </div>
                </div>
                <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-6">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center text-sm">
                      <Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Value Proposition */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 text-center">
          <h3 className="text-3xl font-bold mb-4 gradient-text">
            Why Choose Our Creative Subscription?
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Save $2000+ annually compared to individual tool subscriptions while getting 
            more features, better performance, and seamless integration.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">10x</div>
              <div className="text-muted-foreground">Faster workflow</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">$2000+</div>
              <div className="text-muted-foreground">Annual savings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime guarantee</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                View Pricing Plans
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;