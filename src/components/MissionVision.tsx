import { Card } from "@/components/ui/card";
import { Target, Eye } from "lucide-react";

const MissionVision = () => {
  return (
    <section className="py-20" id="mission-vision">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 takeover-gradient creatives-font">
            Our Mission & Vision
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Driven by purpose and guided by vision to democratize entrepreneurship
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Mission */}
          <Card className="glass-card p-8 hover-lift animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold animated-gradient creatives-font">Our Mission</h3>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p className="text-base leading-relaxed">
                Empower anyone, anywhere, to launch their own startup by making advanced AI automation tools accessible, affordable, and easy to use.
              </p>
              <p className="text-base leading-relaxed">
                We believe entrepreneurship should not be limited by technical skills, financial barriers, or location. Through intelligent automation, we democratize startup creation and ignite a new wave of diverse, AI-powered businesses.
              </p>
            </div>
          </Card>

          {/* Vision */}
          <Card className="glass-card p-8 hover-lift animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold reverse-gradient creatives-font">Our Vision</h3>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <p className="text-base leading-relaxed">
                A future where entrepreneurship is as universal as ambition—where anyone with an idea can turn it into a thriving business, regardless of background or resources.
              </p>
              <p className="text-base leading-relaxed">
                By unlocking the full potential of AI automation, we remove traditional barriers: high costs, technical complexity, and limited access to expert knowledge.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default MissionVision;