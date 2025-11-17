import { Button } from "@/components/ui/button";
import { ArrowRight, Gift, Clock, Users, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { CountdownTimer } from "./CountdownTimer";
import { getPrimaryPromotion } from "@/config/promotions";

const CampaignPromotion = () => {
  const promotion = getPrimaryPromotion('/', 'new');
  
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5" />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-float opacity-60" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-tl from-secondary/10 to-transparent rounded-full blur-3xl animate-float opacity-50" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge with Countdown */}
          <div className="inline-flex flex-col items-center gap-3 glass-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 mb-8 p-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">LIMITED TIME OFFER</span>
            </div>
            {promotion && promotion.showCountdown && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Ends in:</span>
                <CountdownTimer
                  endDate={promotion.endDate}
                  variant="compact"
                  showIcon={false}
                />
              </div>
            )}
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-bold mb-6 animate-slide-up">
            <span className="gradient-text">Get Your FREE Business Report</span>
            <br />
            <span className="text-foreground">Plus Up to 7 Bonus Credits!</span>
          </h2>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Complete our 5-minute feedback survey and receive a comprehensive business analysis report 
            plus bonus credits to unlock premium AI features.
          </p>

          {/* Credit Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary font-bold text-xl">2</span>
              </div>
              <h3 className="font-semibold mb-2">Base Credits</h3>
              <p className="text-sm text-muted-foreground">For completing the survey</p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-secondary font-bold text-xl">+3</span>
              </div>
              <h3 className="font-semibold mb-2">Email Bonus</h3>
              <p className="text-sm text-muted-foreground">For providing your email</p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-accent font-bold text-xl">+2</span>
              </div>
              <h3 className="font-semibold mb-2">Extra Bonuses</h3>
              <p className="text-sm text-muted-foreground">For detailed feedback & referrals</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span>Strategic business analysis report</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span>AI-powered market research and validation</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span>Custom marketing strategies and assets</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span>Bonus credits for premium AI features</span>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5 text-primary" />
              <span>Growing entrepreneur community</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5 text-primary" />
              <span>5 minutes to complete</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gift className="w-5 h-5 text-primary" />
              <span>Professional business insights</span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <Button size="lg" className="glass bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-4 text-lg btn-magnetic relative overflow-hidden group" asChild>
              <Link to="/bizmap-ai">
                <span className="relative z-10">Claim Your FREE Report + Credits</span>
                <ArrowRight className="ml-2 w-5 h-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </Link>
            </Button>
          </div>

          {/* Footer Text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            No credit card required • Survey takes 5 minutes • Credits awarded instantly
          </p>
        </div>
      </div>
    </section>
  );
};

export default CampaignPromotion;