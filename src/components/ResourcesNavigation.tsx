import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Info, 
  Settings, 
  Users, 
  ArrowRight,
  BookOpen,
  Heart,
  Lightbulb
} from "lucide-react";

const ResourcesNavigation = () => {
  const navigationCards = [
    {
      icon: <Info className="w-8 h-8 text-blue-500" />,
      title: "About Our Mission",
      description: "Learn about our story, mission, and commitment to empowering creatives worldwide",
      link: "/about",
      cta: "About Us",
      highlight: false
    },
    {
      icon: <Settings className="w-8 h-8 text-green-500" />,
      title: "Our Services",
      description: "Discover our comprehensive creative subscription and platform services",
      link: "/services",
      cta: "View Services",
      highlight: false
    },
    {
      icon: <Users className="w-8 h-8 text-purple-500" />,
      title: "Join Our Community",
      description: "Connect with 50,000+ creatives in our supportive and inspiring community",
      link: "/community",
      cta: "Join Community",
      highlight: true
    }
  ];

  const resourceHighlights = [
    {
      icon: <BookOpen className="w-6 h-6 text-primary" />,
      stat: "500+",
      label: "Free tutorials covering every creative skill"
    },
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      stat: "200+",
      label: "Comprehensive guides written by experts"
    },
    {
      icon: <Lightbulb className="w-6 h-6 text-primary" />,
      stat: "1000+",
      label: "Premium downloads with commercial license"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Resource Summary */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Your Creative Learning Journey Starts Here
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            We've created the most comprehensive free creative resource library to help you 
            master your craft and achieve your creative goals.
          </p>

          {/* Resource Highlights */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {resourceHighlights.map((item, index) => (
              <div key={index} className="flex items-center justify-center space-x-3">
                {item.icon}
                <div className="text-left">
                  <div className="text-2xl font-bold text-primary">{item.stat}</div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 mb-16">
            <h3 className="text-2xl font-bold mb-4">Get Notified of New Resources</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Be the first to access new tutorials, guides, and downloads. Join our creative community 
              and never miss valuable learning content.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                <Link to="/community">
                  Join Community & Get Updates
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/services">
                  Explore Premium Features
                </Link>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              ✓ Free newsletter  ✓ Exclusive content  ✓ Early access to new resources
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
            Need Help Finding the Right Resources?
          </h4>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Our creative community is here to help! Ask questions, get recommendations, 
            and connect with fellow learners who can guide you on your creative journey.
          </p>
          <Button variant="outline" asChild>
            <Link to="/community">
              Get Community Support
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ResourcesNavigation;