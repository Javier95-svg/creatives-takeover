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
  Sparkles,
  BarChart3,
  Check
} from "lucide-react";

const FeatureHighlights = () => {
  const features = [
    {
      icon: <MessageSquare className="w-10 h-10 text-primary" />,
      title: "AI Business Planning",
      description: "Get personalized business planning support tailored for creative entrepreneurs and innovators.",
      benefits: ["Creative idea structuring", "Market opportunity analysis", "Business model optimization"],
      highlight: "Most Used"
    },
    {
      icon: <Users className="w-10 h-10 text-primary" />,
      title: "Creative Community",
      description: "Network with 15,000+ creative entrepreneurs, startup founders, and innovative solopreneurs.",
      benefits: ["Creative entrepreneur network", "Startup founder discussions", "Innovation collaboration"],
      highlight: "Top Rated"
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-primary" />,
      title: "Market Intelligence",
      description: "Discover profitable opportunities in creative industries and emerging innovation markets.",
      benefits: ["Creative market trends", "Innovation opportunities", "Competitive intelligence"],
      highlight: "New"
    },
    {
      icon: <Target className="w-10 h-10 text-primary" />,
      title: "No-Code Automation",
      description: "Leverage automated tools and templates designed for rapid creative business execution.",
      benefits: ["Automated workflows", "No-code templates", "Business process automation"],
      highlight: ""
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Creative Playbooks",
      description: "Access proven strategies and frameworks from successful creative entrepreneurs and innovators.",
      benefits: ["Creative business frameworks", "Innovation strategies", "Startup playbooks"],
      highlight: ""
    },
    {
      icon: <BarChart3 className="w-10 h-10 text-primary" />,
      title: "Success Analytics",
      description: "Track your creative business performance with metrics that matter to innovative entrepreneurs.",
      benefits: ["Creative business metrics", "Innovation tracking", "Growth analytics"],
      highlight: ""
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
            Built for Creative Entrepreneurs
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Everything You Need to Innovate
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The complete AI-powered toolkit for creative entrepreneurs who want to leverage automation 
            and no-code tools for <strong className="text-foreground">faster business execution</strong>.
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
                    feature.highlight === "Most Used" ? "bg-primary" : 
                    feature.highlight === "Top Rated" ? "bg-success" :
                    feature.highlight === "New" ? "bg-info" : "bg-secondary"
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

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 text-center animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary mr-2" />
            <h3 className="text-2xl font-bold gradient-text">Ready to Innovate?</h3>
          </div>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of creative entrepreneurs and innovators who are building successful businesses with AI automation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/bizmap-ai">
                Start Creating Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/marketplace">
                Explore AI Tools
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;
