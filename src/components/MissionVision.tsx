import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Eye, Heart, Lightbulb } from "lucide-react";

const MissionVision = () => {
  return (
    <section className="py-20 bg-background/50" id="mission-vision">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-6 gradient-text">Our Mission & Vision</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Driven by purpose, guided by vision—discover what makes Creatives Takeover unique
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Mission */}
          <Card className="glass border-border group hover:shadow-xl transition-all duration-500 animate-slide-in-left">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl gradient-text">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-center">
                To guide and support solopreneurs and creators through every stage of their journey, 
                from spark to launch, by building an inclusive, dynamic community and offering 
                step-by-step tools and mentorship to create powerful, no-code applications.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Vision */}
          <Card className="glass border-border group hover:shadow-xl transition-all duration-500 animate-slide-in-right">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl gradient-text">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-center">
                To empower a new wave of creators by making it effortless for anyone, anywhere 
                to turn unique ideas into impactful software—without code, without barriers, 
                and with unlimited creative potential.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Core Values */}
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 gradient-text">Our Core Values</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            <Card className="glass border-border group hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
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

            <Card className="glass border-border group hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionVision;