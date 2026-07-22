import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  DollarSign, 
  Users, 
  BookOpen, 
  ArrowRight,
  MessageCircle,
  Heart,
  Clock
} from "lucide-react";

const FAQNavigation = () => {
  const navigationCards = [
    {
      icon: <DollarSign className="w-8 h-8 text-success" />,
      title: "View Pricing Plans",
      description: "Compare Rookie, Starter, Rising, and Pro by the founder outcome and credit runway each plan enables",
      link: "/pricing",
      cta: "See Pricing",
      highlight: true
    },
    {
      icon: <Users className="w-8 h-8 text-purple-500" />,
      title: "Join Our Community",
      description: "Browse mentors, book a working session, and connect with other founders when you need human input",
      link: "/mentorship",
      cta: "Join Community",
      highlight: false
    },
    {
      icon: <BookOpen className="w-8 h-8 text-info" />,
      title: "Free Resources",
      description: "Use 25 evidence-led guides for customer clarity, validation, MVP building, launch, and fundraising",
      link: "/resources",
      cta: "Browse Resources",
      highlight: false
    }
  ];

  const helpOptions = [
    {
      icon: <MessageCircle className="w-6 h-6 text-primary" />,
      title: "Community Support",
      description: "Search direct answers before opening a support request"
    },
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      title: "Expert Guidance",
      description: "Book a founder or specialist for a focused working session"
    },
    {
      icon: <Clock className="w-6 h-6 text-primary" />,
      title: "Connected Resources",
      description: "Move from an answer to the relevant guide or product tool"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Help Options Summary */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Get the Help You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Whether you need answers about pricing, want to connect with our community, 
            or need a deeper founder guide, use the route that matches the decision in front of you.
          </p>

          {/* Help Highlights */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {helpOptions.map((option, index) => (
              <div key={index} className="flex items-center justify-center space-x-3">
                {option.icon}
                <div className="text-left">
                  <div className="font-semibold">{option.title}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Contact CTA */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 mb-16">
            <h3 className="text-2xl font-bold mb-4">Need Immediate Help?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Send the support team a specific account or billing question, or browse mentors when
              the blocker needs a working session rather than a written answer.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                <Link to="/mentorship">
                  Ask Question in Community
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                <a href="mailto:admin@creatives-takeover.com">Email Support Team</a>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              Searchable answers · Evidence-led guides · Optional expert sessions
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-8 text-center gradient-text">
            Explore More
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {navigationCards.map((card, index) => (
              <Card 
                key={index} 
                className={`glass border-border hover:shadow-lg transition-all duration-300 hover-lift group ${
                  card.highlight ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                }`}
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
                    variant={card.highlight ? "default" : "outline"} 
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

        {/* Final Support Message */}
        <div className="text-center">
          <h4 className="text-lg font-semibold mb-4">
            Have a Suggestion for Our FAQ?
          </h4>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Help us improve by suggesting questions that should be added to our FAQ. 
            Your feedback helps make our platform better for everyone.
          </p>
          <Button variant="outline" asChild>
            <Link to="/mentorship">
              Submit FAQ Suggestion
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FAQNavigation;
