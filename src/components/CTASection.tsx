import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Ready to Transform Your Ideas?
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Join the Revolution in
            <span className="text-primary"> App Development</span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Be part of the next generation of creators building the future. 
            Start your journey today with zero risk and unlimited potential.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Input 
              placeholder="Enter your email address" 
              className="max-w-md bg-background/80 backdrop-blur-sm border-border/50"
            />
            <Button size="lg" className="bg-primary hover:bg-primary/90 min-w-fit">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-2xl font-bold text-primary mb-2">14-Day</h3>
              <p className="text-muted-foreground">Free Trial</p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-primary mb-2">No Credit Card</h3>
              <p className="text-muted-foreground">Required</p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-primary mb-2">24/7</h3>
              <p className="text-muted-foreground">Support</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;