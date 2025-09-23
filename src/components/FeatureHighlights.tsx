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
      title: "AI Idea Validator",
      description: "Know if your startup idea will make money before you waste months building it.",
      benefits: ["Market size analysis", "Competition assessment", "Revenue potential scoring"],
      highlight: "Most Used"
    },
    {
      icon: <Users className="w-10 h-10 text-primary" />,
      title: "Founder Community",
      description: "Network with 15,000+ indie hackers, side hustlers, and successful founders.",
      benefits: ["Daily founder discussions", "Real-time collaboration", "Success story sharing"],
      highlight: "Top Rated"
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-primary" />,
      title: "Market Opportunity Finder",
      description: "Discover profitable niches and trending markets before your competitors do.",
      benefits: ["Trend analysis", "Opportunity alerts", "Revenue forecasting"],
      highlight: "New"
    },
    {
      icon: <Target className="w-10 h-10 text-primary" />,
      title: "Launch Sprint Planner",
      description: "Ship your MVP fast with proven sprint templates used by successful indie hackers.",
      benefits: ["MVP sprint templates", "Launch checklists", "Progress tracking"],
      highlight: ""
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Founder Playbooks",
      description: "Access battle-tested strategies and prompts from founders who've built $1M+ businesses.",
      benefits: ["Success frameworks", "Growth strategies", "Proven templates"],
      highlight: ""
    },
    {
      icon: <BarChart3 className="w-10 h-10 text-primary" />,
      title: "Revenue Tracker",
      description: "Track your path to profitability with metrics that matter to bootstrapped founders.",
      benefits: ["Revenue tracking", "Growth analytics", "Success milestones"],
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
            Built for Indie Hackers
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Everything You Need to Win
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The complete toolkit for founders who want to validate fast, build smart, and launch profitable businesses. 
            <strong className="text-foreground">No fluff, just results.</strong>
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
                    feature.highlight === "Top Rated" ? "bg-green-500" :
                    feature.highlight === "New" ? "bg-blue-500" : "bg-secondary"
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
            <h3 className="text-2xl font-bold gradient-text">Ready to Build Something Great?</h3>
          </div>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of indie hackers and side hustlers who are building profitable businesses with our platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/dream2plan">
                Start Building Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                See Pricing
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;