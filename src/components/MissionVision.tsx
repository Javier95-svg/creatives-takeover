import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Eye, Heart, Lightbulb, Shield, TrendingUp, Cpu, Globe2, Rocket } from "lucide-react";

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
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-center">
                Our mission is to empower anyone, anywhere, to launch their own startup by making advanced AI automation tools accessible, affordable, and easy to use. We believe entrepreneurship should not be limited by technical skills, financial barriers, or location. By combining cutting-edge AI with intuitive workflows, we aim to streamline every stage of the startup journey — from idea validation and market research to branding, product development, and launch — so individuals can focus on innovation, not limitations.
              </CardDescription>
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
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-center">
                We envision a world where any person with an idea can bring it to life in record time, supported by intelligent automation that reduces costs, accelerates progress, and removes complexity. Through our platform, we strive to democratize startup creation and ignite a new wave of diverse, AI-powered businesses that drive economic growth and positive change.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Core Values */}
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 gradient-text animate-text-shimmer" style={{ animationDelay: '0.4s' }}>Our Core Values</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="glass border-border group hover:shadow-lg transition-all duration-300 animate-zoom-in hover-lift btn-magnetic" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary/20 transition-colors">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Community First</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  We believe in the power of connection and collaboration. Every feature we build strengthens our community.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass border-border group hover:shadow-lg transition-all duration-300 animate-zoom-in hover-lift btn-magnetic" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary/20 transition-colors">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Innovation & Accessibility</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  We make cutting-edge technology accessible to everyone, regardless of technical background.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass border-border group hover:shadow-lg transition-all duration-300 animate-zoom-in hover-lift btn-magnetic" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Ownership & Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  We act with honesty, take responsibility, and earn trust through transparency in everything we do.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass border-border group hover:shadow-lg transition-all duration-300 animate-zoom-in hover-lift btn-magnetic" style={{ animationDelay: '0.4s' }}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Impact Over Hype</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  We prioritize meaningful outcomes and tangible results that help you ship, grow, and succeed.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Future Outlook */}
          <h3 className="text-3xl font-bold text-center mt-20 mb-12 gradient-text animate-text-shimmer">Our Future Outlook</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="glass border-border hover:shadow-lg transition-all duration-300 animate-slide-up">
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Cpu className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">AI-Accelerated Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-center">
                  Smarter workflows that automate busywork so you can validate ideas and ship products faster.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass border-border hover:shadow-lg transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Globe2 className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Global Accessibility</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-center">
                  Lowering costs and barriers so anyone can build from anywhere—no technical background required.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass border-border hover:shadow-lg transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Rocket className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Ecosystem Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-center">
                  A thriving marketplace of templates, automations, and community-built tools to accelerate your journey.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionVision;