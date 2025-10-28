import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const StillNotSure = () => {
  const trialFeatures = [
    "Full access to all Creator features",
    "50 AI conversation credits",
    "Community access included",
    "No credit card required"
  ];

  return (
    <section className="py-20 relative z-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Still Not Sure Which Plan is Right for You?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Try our platform risk-free or talk to our team
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Trial Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border-primary/20 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Try it Free for 7 Days
              </h3>
              <p className="text-muted-foreground">
                Experience the full power of our platform
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {trialFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="w-full">
              <Link to="/signup">Start Free Trial</Link>
            </Button>
          </Card>

          {/* Talk to Team Card */}
          <Card className="bg-background/60 backdrop-blur-sm border-border/50 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20 mb-4">
                <Calendar className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Talk to Our Team
              </h3>
              <p className="text-muted-foreground">
                Get personalized recommendations and see a live demo
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Personalized plan recommendations</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Live platform walkthrough</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Custom pricing for teams</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Q&A with product experts</span>
              </li>
            </ul>

            <Button asChild variant="outline" size="lg" className="w-full">
              <Link to="/demo-calls">Schedule a Demo</Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default StillNotSure;
