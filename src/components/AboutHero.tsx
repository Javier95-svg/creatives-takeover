
import { Sparkles, Users, Rocket } from "lucide-react";

const AboutHero = () => {
  return (
    <section className="pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass-card mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Empowering Creators & Entrepreneurs</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-slide-up takeover-title creatives-font">
          <span className="takeover-gradient">Transform ideas into reality</span>
          <br />
          <span className="animated-gradient">with AI-powered tools</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
          We bridge the gap between imagination and implementation, making advanced AI automation accessible to everyone with a vision.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="glass-card btn-magnetic">
            <Users className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-3xl font-bold takeover-gradient mb-2 creatives-font">2,400+</div>
            <div className="text-muted-foreground">Active Creators</div>
          </div>
          <div className="glass-card btn-magnetic">
            <Rocket className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-3xl font-bold animated-gradient mb-2 creatives-font">1,200+</div>
            <div className="text-muted-foreground">Startups Launched</div>
          </div>
          <div className="glass-card btn-magnetic">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-3xl font-bold reverse-gradient mb-2 creatives-font">$12M+</div>
            <div className="text-muted-foreground">Funding Raised</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutHero;