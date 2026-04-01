import { Button } from "@/components/ui/button";
import { ArrowRight, Target, BarChart2, Zap, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  { icon: BarChart2, label: "Niche viability score out of 100" },
  { icon: Target,    label: "Full customer profile & pain points" },
  { icon: Zap,       label: "AI-powered positioning strategy" },
  { icon: CheckCircle, label: "Completely free — no credit card" },
];

const CampaignPromotion = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Stage pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-8 animate-fade-in">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">Stage 1 · Free</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 animate-slide-up">
            Complete Stage 1 —<br />Know Your Customer.
          </h2>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            The ICP Builder gives you a full customer profile, niche score, and positioning map — completely free.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 text-left animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {benefits.map(({ icon: Icon, label }, i) => (
              <div key={i} className="glass-card p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-4 text-base font-semibold" asChild>
              <Link to="/icp-builder">
                Build My ICP for Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Free for all accounts · No credit card required
          </p>
        </div>
      </div>
    </section>
  );
};

export default CampaignPromotion;
