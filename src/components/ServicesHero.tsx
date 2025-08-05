import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const ServicesHero = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-primary mr-3" />
            <span className="text-primary font-semibold text-lg">Creative Subscription Services</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
            Unlimited Design & Creative Platform Solutions
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Transform your creative workflow with our comprehensive subscription services. 
            Get unlimited design access, AI-powered tools, and a complete creative platform 
            designed for modern creatives and businesses.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/community">
                Explore Community
              </Link>
            </Button>
          </div>
          
          <div className="mt-12 text-sm text-muted-foreground">
            <p>✓ No setup fees  ✓ Cancel anytime  ✓ 30-day money-back guarantee</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesHero;