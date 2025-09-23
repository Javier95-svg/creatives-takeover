import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Target,
  ArrowRight,
  Sparkles
} from "lucide-react";

const FeatureHighlights = () => {
  const features = [
    {
      icon: <MessageSquare className="w-8 h-8 text-primary" />,
      title: "AI Business Planning",
      description: "Get personalized business insights with BizMap AI chatbot and strategic planning tools.",
      highlight: "Core Feature",
      link: "/dream2plan"
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Community & Collaboration", 
      description: "Connect with fellow entrepreneurs and collaborate on projects in real-time.",
      highlight: "Most Popular",
      link: "/community"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      title: "Market Intelligence",
      description: "Stay ahead with real-time market insights and trend analysis for your industry.",
      highlight: "New",
      link: "/services"
    },
    {
      icon: <Target className="w-8 h-8 text-primary" />,
      title: "Sprint Planning",
      description: "Organize your projects with advanced sprint planning and Kanban board management.",
      highlight: "",
      link: "/services"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="features">
      <div className="container mx-auto px-6">
        {/* Animated Background Elements */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-float opacity-60" />
        <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full animate-spiral opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full animate-zigzag opacity-50" style={{ animationDelay: '2s' }} />
        
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            AI Solopreneur Platform
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your entrepreneurial journey with our comprehensive AI-powered platform 
            designed for modern solopreneurs and creative professionals.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="relative glass border-border hover:shadow-xl transition-all duration-500 hover-lift group" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              {feature.highlight && (
                <div className="absolute -top-3 left-6">
                  <Badge className={`${
                    feature.highlight === "Most Popular" ? "bg-primary" : 
                    feature.highlight === "New" ? "bg-green-500" : "bg-secondary"
                  } text-white shadow-lg`}>
                    {feature.highlight}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    {feature.icon}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={feature.link}>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 text-center animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary mr-2" />
            <h3 className="text-2xl font-bold gradient-text">Ready to Transform Your Business?</h3>
          </div>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of entrepreneurs who are building successful businesses with our AI-powered platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/dream2plan">
                Start Planning Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;