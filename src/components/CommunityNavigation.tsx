import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  BookOpen, 
  HelpCircle, 
  Home, 
  ArrowRight,
  Users,
  Heart,
  MessageCircle
} from "lucide-react";

const CommunityNavigation = () => {
  const navigationCards = [
    {
      icon: <BookOpen className="w-8 h-8 text-success" />,
      title: "Learning Resources",
      description: "Access tutorials, guides, and exclusive content to enhance your creative skills",
      link: "/resources",
      cta: "Explore Resources",
      highlight: false
    },
    {
      icon: <HelpCircle className="w-8 h-8 text-info" />,
      title: "FAQ & Support",
      description: "Get answers to common questions about our creative community platform",
      link: "/faq",
      cta: "Get Help",
      highlight: false
    },
    {
      icon: <Home className="w-8 h-8 text-purple-500" />,
      title: "Back to Home",
      description: "Return to our main page to explore more about our creative platform",
      link: "/",
      cta: "Go Home",
      highlight: false
    }
  ];

  const joinBenefits = [
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      benefit: "Connect with 50,000+ creatives worldwide"
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-primary" />,
      benefit: "Join real-time discussions and get instant feedback"
    },
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      benefit: "Build lasting relationships in a supportive environment"
    }
  ];

  return (
    <section className="py-20 bg-background" id="join-community">
      <div className="container mx-auto px-6">
        {/* Join Community CTA */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Ready to Join Our Creative Community?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Become part of the most supportive and inspiring creative community platform. 
            Start collaborating, learning, and growing with fellow creatives today.
          </p>

          {/* Join Benefits */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {joinBenefits.map((item, index) => (
              <div key={index} className="flex items-center justify-center space-x-3">
                {item.icon}
                <span className="text-sm text-muted-foreground">{item.benefit}</span>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 mb-16">
            <h3 className="text-2xl font-bold mb-4">Start Your Creative Journey Today</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join for free and get instant access to our creative community, 
              collaboration tools, and exclusive events.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300">
                Join Community Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/pricing">
                  View Premium Benefits
                </Link>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              ✓ Free to join  ✓ No credit card required  ✓ Instant access
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-8 text-center gradient-text">
            Continue Exploring
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {navigationCards.map((card, index) => (
              <Card 
                key={index} 
                className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift group"
              >
                <CardContent className="p-6 text-center">
                  <div className="mx-auto p-4 rounded-full bg-muted/30 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <h4 className="text-xl font-semibold mb-3">{card.title}</h4>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    {card.description}
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300" 
                    asChild
                  >
                    <Link to={card.link}>
                      {card.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Final Community Message */}
        <div className="text-center">
          <h4 className="text-lg font-semibold mb-4">
            Questions about our creative community?
          </h4>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            We're here to help you get started and make the most of your creative community experience. 
            Don't hesitate to reach out if you need any assistance.
          </p>
          <Button variant="outline" asChild>
            <Link to="/faq">
              Contact Community Support
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CommunityNavigation;