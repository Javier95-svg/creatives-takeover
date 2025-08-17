import { Card } from "@/components/ui/card";
import { Target, Eye } from "lucide-react";
const MissionVision = () => {
  return (
    <section className="py-20 bg-background/50" id="mission-vision">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-slide-up">
          <h2 className="text-4xl font-bold mb-6 gradient-text animate-text-shimmer">Our Mission & Vision</h2>
          <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Driven by purpose and guided by vision; discover what makes Creatives Takeover unique
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card className="glass border-border p-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-3xl font-bold gradient-text">Our Mission</h3>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              To empower anyone, anywhere, to launch their own startup by making advanced AI automation tools accessible, affordable, and easy to use.
            </p>
          </Card>

          <Card className="glass border-border p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-3xl font-bold gradient-text">Our Vision</h3>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A future where entrepreneurship is as universal as ambition - where anyone with an idea can turn it into a thriving business, supported by intelligent automation.
            </p>
          </Card>
        </div>

      </div>
    </section>
  );
};

export default MissionVision;