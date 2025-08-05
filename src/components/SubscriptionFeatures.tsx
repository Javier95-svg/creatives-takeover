import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Infinity, 
  Zap, 
  Users, 
  Cloud, 
  Palette, 
  BarChart3,
  Shield,
  Headphones
} from "lucide-react";

const SubscriptionFeatures = () => {
  const features = [
    {
      icon: <Infinity className="w-8 h-8 text-primary" />,
      title: "Unlimited Design Access",
      description: "Access to unlimited design templates, assets, and creative resources. No limits on downloads or usage.",
      benefits: ["10,000+ premium templates", "Unlimited downloads", "Commercial licensing included"]
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: "AI-Powered Creative Tools",
      description: "Advanced AI assistance for content creation, design optimization, and creative workflow automation.",
      benefits: ["Smart design suggestions", "Automated optimization", "AI content generation"]
    },
    {
      icon: <Cloud className="w-8 h-8 text-primary" />,
      title: "Cloud-Based Creative Platform",
      description: "Work from anywhere with our cloud-based platform. Real-time collaboration and sync across devices.",
      benefits: ["Real-time collaboration", "Cross-device sync", "Cloud storage included"]
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Team Collaboration",
      description: "Seamless team workflows with shared workspaces, project management, and collaborative editing.",
      benefits: ["Shared workspaces", "Team permissions", "Project management tools"]
    },
    {
      icon: <Palette className="w-8 h-8 text-primary" />,
      title: "Creative Asset Library",
      description: "Extensive library of fonts, graphics, photos, and multimedia assets for all your creative projects.",
      benefits: ["Premium stock photos", "Custom fonts", "Vector graphics library"]
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Analytics & Insights",
      description: "Track performance, analyze creative metrics, and optimize your content strategy with detailed insights.",
      benefits: ["Performance tracking", "Creative analytics", "ROI measurement"]
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "Enterprise Security",
      description: "Bank-level security with encrypted storage, secure collaboration, and compliance management.",
      benefits: ["End-to-end encryption", "GDPR compliance", "Secure file sharing"]
    },
    {
      icon: <Headphones className="w-8 h-8 text-primary" />,
      title: "Priority Support",
      description: "24/7 priority support, dedicated account management, and expert creative consultation.",
      benefits: ["24/7 live chat", "Phone support", "Creative consultation"]
    }
  ];

  return (
    <section className="py-20 bg-muted/30" id="subscription-features">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Comprehensive Creative Subscription Services
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to elevate your creative work. Our subscription platform 
            combines unlimited design access with powerful tools and collaborative features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift animate-slide-in-left" 
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-lg bg-primary/10 mr-4">
                    {feature.icon}
                  </div>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2 flex-shrink-0"></div>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" className="text-lg px-8 py-6" asChild>
            <Link to="/pricing">
              Start Free Trial - Get Full Access
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            All features included • No hidden fees • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;