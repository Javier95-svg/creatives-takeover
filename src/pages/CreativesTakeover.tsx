import CreativesTakeoverLayout from '@/components/CreativesTakeoverLayout';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Palette, Zap, Brain, Users } from 'lucide-react';

const CreativesTakeover = () => {
  return (
    <CreativesTakeoverLayout>
      <SEO
        title="Creatives Takeover Studio"
        description="Explore Creatives Takeover's creative studio positioning, AI-enhanced workflows, and modern design execution approach."
        keywords="creative studio, design systems, AI workflows, branding, creative execution"
        url="/creatives-takeover"
      />
      {/* Hero Section */}
      <section className="hero relative min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-background via-card to-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        
        <div className="container relative z-10 mx-auto px-4 lg:px-6 text-center">
          <h1 className="takeover-title text-4xl md:text-6xl lg:text-7xl font-bold mb-6 takeover-gradient leading-tight">
            Take over the creative world — one project at a time
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            We empower creative professionals and agencies with cutting-edge design solutions, 
            innovative workflows, and strategic guidance to dominate their markets.
          </p>
          
          <Button 
            asChild 
            size="lg" 
            className="btn-magnetic bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
          >
            <a href="#services">
              Start Your Takeover <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </Button>
        </div>
      </section>

      {/* Work Section */}
      <section id="work" className="py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">
            Our Creative Arsenal
          </h2>
          
          <div className="cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card glass-card hover-lift group cursor-pointer">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Design Sprint</h3>
                <p className="text-muted-foreground">
                  Rapid prototyping and validation to bring ideas to market faster than ever.
                </p>
              </div>
            </Card>

            <Card className="card glass-card hover-lift group cursor-pointer">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-secondary/10 rounded-full flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Palette className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Brand Systems</h3>
                <p className="text-muted-foreground">
                  Comprehensive brand identity systems that create lasting market presence.
                </p>
              </div>
            </Card>

            <Card className="card glass-card hover-lift group cursor-pointer">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Brain className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI Workflows</h3>
                <p className="text-muted-foreground">
                  Cutting-edge AI integration to supercharge creative productivity.
                </p>
              </div>
            </Card>

            <Card className="card glass-card hover-lift group cursor-pointer">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Workshops</h3>
                <p className="text-muted-foreground">
                  Strategic training sessions to elevate your team's creative capabilities.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">
              Services That Deliver Results
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From concept to execution, we provide the strategic advantage you need to dominate your market.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="glass-card text-center">
              <div className="p-8">
                <h3 className="text-2xl font-semibold mb-4">Strategic Design</h3>
                <p className="text-muted-foreground mb-6">
                  Data-driven design decisions that align with your business objectives and market positioning.
                </p>
                <Button variant="outline" className="w-full">Learn More</Button>
              </div>
            </Card>
            
            <Card className="glass-card text-center">
              <div className="p-8">
                <h3 className="text-2xl font-semibold mb-4">Creative Direction</h3>
                <p className="text-muted-foreground mb-6">
                  Visionary leadership that transforms creative chaos into cohesive, powerful brand experiences.
                </p>
                <Button variant="outline" className="w-full">Learn More</Button>
              </div>
            </Card>
            
            <Card className="glass-card text-center">
              <div className="p-8">
                <h3 className="text-2xl font-semibold mb-4">Innovation Labs</h3>
                <p className="text-muted-foreground mb-6">
                  Experimental spaces where breakthrough creative solutions are born and refined.
                </p>
                <Button variant="outline" className="w-full">Learn More</Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="about-inner grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">
                We Are the Creative Revolution
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                At Creatives Takeover, we believe that exceptional creative work has the power to transform businesses, 
                inspire audiences, and shape the future. Our team of visionary designers, strategists, and innovators 
                work at the intersection of art and technology.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We don't just create designs — we craft experiences that resonate, strategies that perform, 
                and solutions that drive measurable results. Join the creative revolution.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="btn-magnetic bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                <a href="#contact">Get Started</a>
              </Button>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-3xl flex items-center justify-center">
                <div className="text-6xl opacity-20">🎨</div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full animate-float" />
              <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-secondary/10 rounded-full animate-float-reverse" />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">
            Ready to Take Over?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Let's discuss how we can help you dominate your market through exceptional creative work.
          </p>
          <Button 
            asChild 
            size="lg" 
            className="btn-start-creating bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 py-4 text-lg"
          >
            <a href="mailto:hello@creativestakeover.com">
              Start Your Project
            </a>
          </Button>
        </div>
      </section>

      {/* Screen Reader Only Text */}
      <span className="sr-only">
        Creatives Takeover - Professional creative agency specializing in design sprints, 
        brand systems, AI workflows, and strategic workshops for creative domination.
      </span>
    </CreativesTakeoverLayout>
  );
};

export default CreativesTakeover;
