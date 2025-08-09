import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Eye, CheckCircle2, Sparkles, Rocket } from "lucide-react";

const MissionVision = () => {
  return (
    <section className="py-20 bg-background/50" id="mission-vision">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-4xl font-bold mb-6 gradient-text animate-text-shimmer">Our Mission & Vision</h2>
          <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Driven by purpose, guided by vision—discover what makes Creatives Takeover unique
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Mission */}
          <Card className="glass border-border group hover:shadow-xl transition-all duration-500 animate-slide-in-left hover-lift btn-magnetic">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl gradient-text animate-text-shimmer">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <p className="text-base md:text-lg leading-relaxed text-foreground/90 text-center">
                Empower anyone, anywhere to launch—by making AI automation accessible, affordable, and easy to use.
              </p>
              <ul className="mt-5 space-y-3 text-left">
                <li className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm md:text-base text-muted-foreground">No technical barriers—intuitive, creator-friendly workflows from idea to launch.</span>
                </li>
                <li className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm md:text-base text-muted-foreground">Cutting-edge AI that simplifies research, branding, product build, and go-to-market.</span>
                </li>
                <li className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                  <Rocket className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm md:text-base text-muted-foreground">Faster progress, lower costs—so you can focus on creativity and impact.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Vision */}
          <Card className="glass border-border group hover:shadow-xl transition-all duration-500 animate-slide-in-right hover-lift btn-magnetic" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl gradient-text animate-text-shimmer">Our Vision</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <p className="text-base md:text-lg leading-relaxed text-foreground/90 text-center">
                Entrepreneurship is accelerating with AI—making speed, scale, and access the new norm.
              </p>
              <ul className="mt-5 space-y-3 text-left">
                <li className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm md:text-base text-muted-foreground">Barriers to entry are dissolving—imagination drives momentum, not resources.</span>
                </li>
                <li className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm md:text-base text-muted-foreground">AI-powered automation unlocks global reach and rapid iteration.</span>
                </li>
                <li className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                  <Rocket className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm md:text-base text-muted-foreground">A future where anyone, anywhere can build—confidently and quickly.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

      </div>
    </section>
  );
};

export default MissionVision;