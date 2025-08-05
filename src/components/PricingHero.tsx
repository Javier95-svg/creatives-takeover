import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, DollarSign } from "lucide-react";

const PricingHero = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <DollarSign className="w-8 h-8 text-primary mr-3" />
            <span className="text-primary font-semibold text-lg">Transparent Pricing</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
            Pricing
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Affordable creative platform pricing designed for every budget. 
            Choose the perfect membership tier and unlock unlimited design potential 
            with our comprehensive creative subscription plans.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="#pricing-plans">
                View Plans
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/services">
                View All Features
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-sm text-muted-foreground">
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              30-day free trial
            </div>
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              No setup fees
            </div>
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
              Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingHero;