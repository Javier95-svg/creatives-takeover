import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wrench, Users, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const InternalLinks = () => {
  const links = [
    {
      title: "Our Services",
      description: "Discover how we help creators and solopreneurs build powerful no-code applications from concept to launch.",
      icon: Wrench,
      href: "/services",
      cta: "Explore Services"
    },
    {
      title: "Join Our Community",
      description: "Connect with like-minded creators, share your journey, and get support from our vibrant community.",
      icon: Users,
      href: "/community",
      cta: "Join Community"
    },
    {
      title: "Free Resources",
      description: "Access our comprehensive library of guides, templates, and tools to accelerate your creative projects.",
      icon: BookOpen,
      href: "/resources",
      cta: "Browse Resources"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-4xl font-bold mb-6 gradient-text animate-text-shimmer">Continue Your Journey</h2>
          <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Ready to dive deeper? Explore everything Creatives Takeover has to offer
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {links.map((link, index) => (
            <Card 
              key={link.title}
              className="glass border-border group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 animate-zoom-in hover-lift btn-magnetic"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors group-hover:scale-110 duration-300">
                  <link.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl gradient-text">{link.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <CardDescription className="text-base leading-relaxed">
                  {link.description}
                </CardDescription>
                <Link to={link.href}>
                  <Button 
                    variant="outline" 
                    className="group/btn w-full border-primary/20 hover:border-primary hover:bg-primary/5"
                  >
                    {link.cta}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional CTA */}
        <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 gradient-text">Ready to Start Building?</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Join thousands of creators who've already started their journey with Creatives Takeover. 
              Your next breakthrough is just one click away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Start Your Free Trial
              </Button>
              <Button variant="outline" size="lg">
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InternalLinks;