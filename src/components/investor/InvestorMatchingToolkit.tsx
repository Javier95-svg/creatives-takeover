import React, { useState, useEffect } from 'react';
import { Users, Search, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const InvestorMatchingToolkit = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we should scroll here from readiness assessment
    const assessmentData = localStorage.getItem('ct_assessment_data');
    if (assessmentData) {
      setIsVisible(true);
      // Clear the flag after a moment
      setTimeout(() => {
        localStorage.removeItem('ct_assessment_data');
      }, 1000);
    }
  }, []);

  return (
    <section 
      id="investor-matching-section"
      className="py-20 px-4 relative overflow-hidden" 
      data-section="investor-matching"
    >
      {/* Background styling - matching other sections */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div
          className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
            animationDuration: '28s'
          }}
        />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Investor Matchmaker
            </h2>
            <span className="text-4xl md:text-5xl">🎯</span>
          </div>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Find the perfect investors for your startup AND generate personalized outreach materials (pitch decks, emails, one-pagers) - all in one tool.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-primary/20 shadow-lg backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold mb-2">
              AI Investor Matching + Outreach Generator
            </CardTitle>
            <CardDescription className="text-base">
              Two-in-one tool: Find your perfect investors AND generate personalized pitch decks, emails, and one-pagers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Search className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">AI-Powered Investor Matching</h3>
                  <p className="text-sm text-muted-foreground">
                    Get matched with 5-15 investors based on stage, industry, geography, check size, and portfolio similarity. Ranked by match score with personalized recommendations.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-1">Outreach Playbook Generator</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate personalized pitch decks (12-15 slides), cold emails (with subject variations), and one-pagers tailored to each matched investor.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-6 mt-6">
              <p className="text-sm font-medium text-center mb-3 text-muted-foreground">
                This hybrid tool combines both features into one seamless workflow:
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">1. Match Investors</span>
                <ArrowRight className="h-4 w-4" />
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">2. Generate Outreach</span>
                <ArrowRight className="h-4 w-4" />
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">3. Connect & Fundraise</span>
              </div>
            </div>

            <div className="text-center pt-4">
              <Button size="lg" className="w-full sm:w-auto" disabled>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Feature Coming Soon
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                The full matching tool is currently being built. Check back soon!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default InvestorMatchingToolkit;

